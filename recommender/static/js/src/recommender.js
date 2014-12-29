if (typeof Logger == 'undefined') {
    var Logger = {
        log: function(a) { return; }
    }
}

function RecommenderXBlock(runtime, element, init_data) {
    /* Grab URLs from server */
    var handleVoteUrl = runtime.handlerUrl(element, 'handle_vote');
    var addResourceUrl = runtime.handlerUrl(element, 'add_resource');
    var editResourceUrl = runtime.handlerUrl(element, 'edit_resource');
    var flagResourceUrl = runtime.handlerUrl(element, 'flag_resource');
    var exportResourceUrl = runtime.handlerUrl(element, 'export_resources');
    var importResourceUrl = runtime.handlerUrl(element, 'import_resources');
    var uploadScreenshotUrl = runtime.handlerUrl(element, 'upload_screenshot');
    var deendorseResourceUrl = runtime.handlerUrl(element, 'deendorse_resource');
    var endorseResourceUrl = runtime.handlerUrl(element, 'endorse_resource');
    var getAccumFlaggedResourceUrl = runtime.handlerUrl(element, 'get_accum_flagged_resource');

    /* Define global configuration variables */
    var DISABLE_DEV_UX, CURRENT_PAGE, ENTRIES_PER_PAGE, PAGE_SPAN, IS_USER_STAFF, FLAGGED_RESOURCE_REASONS;

    /**
     * Generate the dictionary for logging an event.
     * @param {string} status The status of the logged event.
     * @param {dictionary=} information The information (e.g., submitted resource, clicked resource id, etc.) coming along with the event
     * @returns {dictionary} The dictionary for logging an event.
     */
    function generateLog(status, information) {
        if (!information) {
            return { 'status': status, 'element': $(element).attr('data-usage-id') };
        }
        else {
            return {
                'status': status,
                'information': information,
                'element': $(element).attr('data-usage-id')
            }
        }
    }

    /**
     * Expand or collapse resource list.
     * This function is triggered when clicking on the header of the resource list.
     */
    function bindToggleResourceListEvent() {
        if ($(this).hasClass('resourceListExpanded')) {
            Logger.log('mit.recommender.hideShow', generateLog(loggerStatus['hideShow']['hide']));
            $(".recommenderRowInner", element).slideUp('fast');
            $(this).text(resourceListHeader['show']);
        }
        else {
            Logger.log('mit.recommender.hideShow', generateLog(loggerStatus['hideShow']['show']));
            $(".recommenderRowInner", element).slideDown('fast');
            $(this).text(resourceListHeader['hide']);
        }
        $(this).toggleClass('resourceListExpanded');
        addTooltip();
    }

    /**
     * Show resources and page icons for the current page.
     */
    function pagination() {
        /* Show resources for the current page */
        $('.recommenderResource', element).each(function(index, ele) {
            if (index < (CURRENT_PAGE-1)*ENTRIES_PER_PAGE || index >= CURRENT_PAGE*ENTRIES_PER_PAGE) { $(ele, element).hide().attr('aria-hidden', 'true'); }
            else { $(ele, element).show().attr('aria-hidden', 'false'); }
        });

        /* Show page icons for the current page */
        $('.paginationItem', element).each(function(index, ele) {
            if (index + 1 == CURRENT_PAGE) { $(ele, element).show().attr('aria-hidden', 'false'); }
            else { $(ele, element).hide().attr('aria-hidden', 'true'); }
        });
    }
    
    /** 
     * Create pagination items and bind page-changing event. In each event, we
     * will call pagination() for showing proper resources. Each item
     * contains a sequences of buttons corresponding to one page of resources.
     * We can switch between pages by clicking on these buttons.
     */
    function paginationItem() {
        var totalNumberOfPages = Math.ceil($('.recommenderResource', element).length/ENTRIES_PER_PAGE);
        $('.paginationItem', element).remove();
        $('.paginationPageNumber', element).unbind();
        if (totalNumberOfPages == 1) { return; }

        /* Each paginationItem correspond to each page of resource list */
        for (var paginationItemIndex = 1; paginationItemIndex <= totalNumberOfPages; paginationItemIndex++) {
            var renderData = {
                /* No previous page if current page = 1 */
                paginationItemIndexIsOne: (paginationItemIndex == 1),
                noMorePreviousPageIcon: (paginationItemIndex - PAGE_SPAN <= 1),
                pageNumberIndexes: [],
                noMoreNextPageIcon: (paginationItemIndex + PAGE_SPAN >= totalNumberOfPages),
                /* No next page if current page is last page */
                paginationItemIndexIsLast: (paginationItemIndex == totalNumberOfPages)
            }
            
            for (var i = paginationItemIndex - PAGE_SPAN; i <= paginationItemIndex + PAGE_SPAN; i++) {
                renderData.pageNumberIndexes.push({
                    pageNumberIndex: i,
                    pageNumberIndexIsActive: (i == paginationItemIndex),
                    pageNumberIndexOutOfRange: (i <= 0 || i > totalNumberOfPages)
                });
            }

            var paginationItemDiv = $(Mustache.render($("#paginationItemTemplate").html(), renderData));
            $('.pagination', element).append(paginationItemDiv);
        }

        /* Page-changing event */
        $('.paginationPageNumber', element).click(function () {
            var previousPage = CURRENT_PAGE.toString();
            if ($(this).hasClass('morePageIcon')) {
                Logger.log('mit.recommender.pagination', generateLog(loggerStatus['pagination']['moreIcon']));
                return;
            }
            else if ($(this).hasClass('previousPageIcon')) {
                CURRENT_PAGE -= 1;
            }
            else if ($(this).hasClass('nextPageIcon')) { CURRENT_PAGE += 1; }
            else { CURRENT_PAGE = parseInt($(this).text()); }
            var status = loggerStatus['pagination']['toPageNIcon'](previousPage, CURRENT_PAGE.toString())
            Logger.log('mit.recommender.pagination', generateLog(status));
            pagination();
        });
    }

    /**
     * Export all resources from the Recommender. This is intentionally not limited to staff
     * members (community contributions do not belong to the course staff). Sensitive
     * information is exported *is* limited (flagged resources, and in the future, PII if
     * any).
     */
    function bindExportResourceEvent() {
        $.ajax({
            type: "POST",
            url: exportResourceUrl,
            data: JSON.stringify({}),
            success: function(result) {
                if (result['Success'] == true) {
                    var resourceContent = exportResourceFileInfo['fileType'];
                    resourceContent += JSON.stringify(result['export']);

                    var encodedUri = encodeURI(resourceContent);
                    var link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", exportResourceFileInfo['fileName']);
                    link.click();

                    Logger.log('mit.recommender.exportResource', generateLog(
                        loggerStatus['exportResource']['exportResource'], result
                    ));
                }
            }
        });
    }

    /**
     * Clear the previously given information in the page for importing resources.
     */
    function resetImportResourcePage() {
        $('.importResourceFile', element).val('');
        $('.importResourceSubmit', element).attr('disabled', true);
    }

    /**
     * Hide resource list and show pages for modifying
     * (i.e., add/edit/endorse/deendorse/import/flag) recommender
     * @param {string} page The string indicating the page we are going to show. 
     */
    function showModifyingPage(page) {
        $(page, element).show().attr('aria-hidden', 'false');
        $('.recommenderContent', element).hide().attr('aria-hidden', 'true');
        $('.recommenderModify', element).show().attr('aria-hidden', 'false');
        $('.recommenderModifyTitle', element).text(headerText[page]);
    }

    /**
     * Import resources into the recommender.
     */
    function bindImportResourceEvent() {
        Logger.log('mit.recommender.importResource', generateLog(loggerStatus['importResource']['attempt']));

        resetImportResourcePage();
        showModifyingPage('.importResourcePage');
        $('.importResourceFile', element).change(function() { $('.importResourceSubmit', element).attr('disabled', false); });

        $('.importResourceSubmit', element).click(function() {
            var formDiv = $('.importResourceForm', element);
            var file = new FormData($(formDiv)[0]);

            $.ajax({
                type: 'POST',
                url: importResourceUrl,
                data: file,
                contentType: false,
                cache: false,
                processData: false,
                async: false,
                complete: function(result) {
                    for (var key in importResourceError) {
                        if (result.responseText.indexOf(importResourceError[key]) == 0) {
                            alert(importResourceErrorText[importResourceError[key]]);
                            resetImportResourcePage();
                            return;
                        }
                    }
                    /* Rendering new resources */
                    data = JSON.parse(result.responseText);
                    $('.recommenderResource', element).remove();
                    for (var resource_id in data['recommendations']) {
                        item = data['recommendations'][resource_id];
                        var newResourceDiv = showResourceEntry(item['upvotes'] - item['downvotes'], item);

                        if (data['endorsed_recommendation_ids'].indexOf(resource_id) != -1){
                            $('.endorse', newResourceDiv).addClass('endorsed');
                            $('.recommenderEndorseReason', newResourceDiv).text(data['endorsed_recommendation_reasons'][data['endorsed_recommendation_ids'].indexOf(resource_id)]);
                        }
                    }
                    paginationItem();
                    pagination();
                    backToView();
                    Logger.log('mit.recommender.importResource', generateLog(loggerStatus['importResource']['complete'], data));
                },
            });
        });
    }

    /**
     * Switch from pages for resource addition, edit, flag, etc. to pages for viewing resources.
     */
    function backToView() {
        modals = [
            '.recommenderModify',
            '.flagResourcePage',
            '.editResourcePage',
            '.addResourcePage',
            '.deendorsePage',
            '.endorsePage',
            '.importResourcePage'
        ]
        for (i = 0; i < modals.length; i++){
            $(modals[i], element).hide().attr('aria-hidden', 'true');
        }

        if ($('.recommenderResource', element).length == 0) {
            $('.noResourceIntro', element).show().attr('aria-hidden', 'false');
        }
        $('.recommenderResource', element).removeClass('resourceHovered');
        $('.previewingImg', element).hide().attr('aria-hidden', 'true');
        $('.descriptionText', element).hide().attr('aria-hidden', 'true');
        if (!DISABLE_DEV_UX) {
            $('.showProblematicReasons', element).hide().attr('aria-hidden', 'true');
            $('.showEndorsedReasons', element).hide().attr('aria-hidden', 'true');
        }
        $('.recommenderContent', element).show().attr('aria-hidden', 'false');
    }

    /**
     * Log the typed information for an incomplete submission.
     * @param {string} selector The string indicating the element we are going to select and log its value.
     * @param {element} activePage The element which is currently shown to learners.
     * @param {dictionary} logStudentInput The information which will be logged.
     * @returns {dictionary} The information which will be logged.
     */
    function logTypedInformation(selector, activePage, logStudentInput) {
        if ($(selector, activePage).length != 0) {
            $(selector, activePage).each(function() {
                logStudentInput[$(this).clone().removeClass('tooltipstered').attr('class').trim()] = $(this).val();
            });
        }
        return logStudentInput;
    }

    /**
     * Interrupt a submission (resource add, edit, flag, endorse, deendorse,
     * import, etc.). First, log the typed information for an incomplete
     * submission. Second, go back from pages for resource addition, edit,
     * flag, etc. to pages for viewing resources.
     */
    function bindInterruptSubmissionEvent() {
        var divs = $('.flagResourcePage, .editResourcePage, .addResourcePage, .deendorsePage, .endorsePage, .importResourcePage', element);
        var activePage;
        var logStudentInput = {};

        for (var key in divs) {
            if ($(divs[key]).is(':visible')) {
                activePage = divs[key];
                break;
            }
        }
        
        logStudentInput = logTypedInformation('textarea', activePage, logStudentInput);
        logStudentInput = logTypedInformation('input[type="text"]', activePage, logStudentInput);
        logStudentInput = logTypedInformation('input[type="file"]', activePage, logStudentInput);
        Logger.log('mit.recommender.backToView', generateLog(loggerStatus['backToView']['backToView'], logStudentInput));

        var canGoBackToView = true;
        if ($('input[type="button"]:disabled', activePage).length == 0) {
            canGoBackToView = confirm(confirmInterruptSubmission)
        }
        if (canGoBackToView) { backToView(); }
    }

    /**
     * Clear the previously given information in the page for adding resources.
     */
    function resetAddResourcePage() {
        $('.addResourcePage', element).find('input[type="text"]').val('');
        $('.addResourcePage', element).find('textarea').val('')
        $('.addResourceForm', element).find("input[name='file']").val('');
        $('.addSubmit', element).attr('disabled', true);
    }

    /**
     * Check whether enough information (title/url) is provided for
     * recommending a resource, if yes, enable the summission button.
     */
    function enableAddSubmit() {
        if ($('.inTitle', element).val() == '' || $('.inUrl', element).val() == '') {
            $('.addSubmit', element).attr('disabled', true);
            return;
        }
        $('.addSubmit', element).attr('disabled', false);
    }

    /**
     * Show a resource in the resource list.
     * @param {number} votes The votes which the shown resource have.
     * @param {dictionary} resource The resource to be shown.
     * @returns {element} The element of shown resource.
     */
    function showResourceEntry(votes, resource) {
        /* Decide the position for the added resource (pos), by sorting the votes */
        var pos = -1;
        $('.recommenderVoteScore', element).each(function(idx, ele){ 
            if (parseInt($(ele).text()) < votes) {
                pos = idx;
                return false;
            }
        });

        /* Show the added resource at the decided position (pos), and lead learners to that page */
        if ($('.recommenderResource', element).length == 0) {
            $('.noResourceIntro', element).hide().attr('aria-hidden', 'true');
            $('.descriptionText', element).show().attr('aria-hidden', 'false');
            CURRENT_PAGE = 1;
        }
        else {
            if (pos == -1) {
                var toDiv = $('.recommenderResource:last', element);
                CURRENT_PAGE = Math.ceil(($('.recommenderResource', element).length+1)/ENTRIES_PER_PAGE);
            }
            else {
                var toDiv = $('.recommenderResource:eq(' + pos.toString() + ')', element);
                CURRENT_PAGE = Math.ceil((pos + 1)/ENTRIES_PER_PAGE); 
            }
        }
        var renderData = {
            resourceUrl: resource['url'],
            resourceTitle: resource['title'],
            resourceImg: resource['description'],
            resourceText: resource['descriptionText'],
            resourceId: resource['id']
        }

        var newDiv = $(Mustache.render($("#recommenderResourceTemplate").html(), renderData));
        bindResourceDependentEvent(newDiv);
        if (IS_USER_STAFF) { bindStaffLimitedResourceDependentEvent(newDiv); }

        if ($('.recommenderResource', element).length == 0) {
            $('.noResourceIntro', element).after(newDiv);
        }
        else {
            if (pos == -1) { $(toDiv).after(newDiv); }
            else { $(toDiv).before(newDiv); }
        }
        $('.recommenderVoteScore', newDiv).text(votes);
        addResourceDependentTooltip(newDiv);

        return newDiv;
    }
    
    /**
     * Add the new resource to the database, and update the resource list.
     * @param {dictionary} data The resource to be added.
     */
    function addResource(data) {
        $.ajax({
            type: "POST",
            url: addResourceUrl,
            data: JSON.stringify(data),
            success: function(result) {
                if (result['Success'] == true) {
                    showResourceEntry(0, result);
                    
                    resetAddResourcePage();
                    paginationItem();
                    pagination();
                    backToView();
                }
                else { alert(result['error']); }
            }
        });
    }

    /**
     * Upload the screenshot of resource before writing (adding/editing) the
     * submitted resource to database.
     * @param {element} formDiv The submission form for the resource.
     * @param {file} file The file of screenshot.
     * @param {string} writeType The string indicating we are going to add or edit resource.
     * @param {dictionary} data The resource to be written.
     */
    function writeResourceWithScreenshot(formDiv, file, writeType, data) {
        $.ajax({
            type: 'POST',
            url: uploadScreenshotUrl,
            data: file,
            contentType: false,
            cache: false,
            processData: false,
            async: false,
            complete: function(result) {
                /**
                 * File uploading error:
                 * 1. The provided file is in wrong file type: accept files only in jpg, png, and gif.
                 * 2. The filesystem (e.g., Amazon S3) is not properly set
                 * 3. Size of uploaded file exceeds threshold
                 */
                for (var key in uploadFileError) {
                    if (result.responseText.indexOf(uploadFileError[key]) == 0) {
                        alert(uploadFileErrorText[uploadFileError[key]]);
                        $("input[name='file']", formDiv).val('');
                        if (writeType == writeDatabaseEnum.ADD) { enableAddSubmit(); }
                        else if (writeType == writeDatabaseEnum.EDIT) { enableEditSubmit(); }
                        return;
                    }
                }
                /* Writing the resource to database */
                data['description'] = result.responseText;
                if (writeType == writeDatabaseEnum.ADD) { addResource(data); }
                else if (writeType == writeDatabaseEnum.EDIT) { editResource(data); }
            },
        });
    }

    /**
     * Bind the event for adding a resource into the recommender.
     */
    function bindResourceAddEvent() {
        /* Entering the page for adding resources */
        $('.resourceAddButton', element).click(function() {
            Logger.log('mit.recommender.addResource', generateLog(loggerStatus['addResource']['attempt']));
        
            resetAddResourcePage();
            showModifyingPage('.addResourcePage');
        });

        /* If the input (text) area is changed, check whether user provides enough information for the resource */
        $('.inTitle,.inUrl,.inDescriptionText', element).bind('input propertychange', function() { enableAddSubmit(); });
        $('.addResourceForm', element).find("input[name='file']").change(function() {
            if ($(this).val() != '') { enableAddSubmit(); }
        });

        /* Upload the screenshot, add the new resource in the database, and update the resource list */
        $('.addSubmit', element).click(function() {
            /* data: resource to be added to database */
            var data = {};
            data['url'] = $('.inUrl', element).val();
            data['title'] = $('.inTitle', element).val();
            data['descriptionText'] = $('.inDescriptionText', element).val();
            data['description'] = '';
            var formDiv = $('.addResourceForm', element);
            var file = new FormData($(formDiv)[0]);

            var information = $.extend({}, data);
            information['description'] = $("input[name='file']", formDiv).val();
            Logger.log('mit.recommender.addResource', generateLog(loggerStatus['addResource']['complete'], information));
            
            /* Add resource when the screenshot isn't/is provided */
            if ($("input[name='file']", formDiv).val() == '') { addResource(data); }
            else { writeResourceWithScreenshot(formDiv, file, writeDatabaseEnum.ADD, data); }
        });
    }

    /**
     * Bind upvote/downvote event for the given resource.
     * @param {string} voteType The string indicating we are going to upvote or downvote.
     * @param {element} ele The recommenderResource element the upvote/downvote events will be bound to.
     */
    function bindResourceVoteEvent(voteType, ele) {
        var voteConfig = voteConfigs[voteType];

        $('.' + voteConfig['buttonClassName'], ele).click(function() {
            var data = {};
            data['id'] = $(this).parent().parent().find('.recommenderEntryId').text();
            data['event'] = voteConfig['serverEventName'];
            if (data['id'] == -1) { return; }
            Logger.log('mit.recommender.' + voteConfig['eventName'], generateLog(voteConfig['eventName'], {'id': data['id']}));
            
            $.ajax({
                type: "POST",
                url: handleVoteUrl,
                data: JSON.stringify(data),
                success: function(result) {
                    if (result['Success'] == true) {
                        var resource = $('.recommenderResource:eq(' + findResourceDiv(result['id']).toString() + ')', element);
                        $('.recommenderVoteArrowUp, .recommenderVoteArrowDown, .recommenderVoteScore', resource)
                            .toggleClass(voteConfig['voteClassName']);
                        if (toggleVoteFlag in result) {
                            $('.recommenderVoteArrowUp, .recommenderVoteArrowDown, .recommenderVoteScore', resource)
                                .toggleClass(voteConfig['previousVoteClassName']);
                        }
                        setVoteAriaParam(resource);
                        $('.recommenderVoteScore', resource).html(result['newVotes'].toString());
                    }
                    else { alert(result['error']); }
                }
            });
        });
    }
    
    /**
     * Show screenshot (preview image) and description of a resource when hovering over it.
     * @param {element} ele The recommenderResource element the hover event will be bound to.
     */
    function bindResourceHoverEvent(ele) {
        $(ele).hover(
            function() {
                $('.recommenderResource', element).removeClass('resourceHovered');
                $(this).addClass('resourceHovered');

                $('.descriptionText', element).hide().attr('aria-hidden', 'true');
                $('.descriptionText', element).text($('.recommenderDescriptionText', this).text());                
                if ($('.descriptionText', element).text() != '') { $('.descriptionText', element).show().attr('aria-hidden', 'false'); }

                $('.previewingImg', element).show();
                $('.previewingImg', element).attr('src', $('.recommenderDescriptionImg', this).text());
                $(".previewingImg", element).error(function() { $('.previewingImg', element).hide(); });
                if ($('.previewingImg', element).attr('src') == '') { $('.previewingImg', element).hide(); }

                if (!DISABLE_DEV_UX) {
                    $('.showProblematicReasons', element).hide().attr('aria-hidden', 'true');
                    if (!$.isEmptyObject(FLAGGED_RESOURCE_REASONS)) {
                        var resourceId = $('.recommenderEntryId', this).text();
                        var reasons = '';
                        /**
                         * FLAGGED_RESOURCE_REASONS is empty except that user is course staff.
                         * Therefore, the content in showProblematicReasons will be showed only to staff.
                         */
                        if (resourceId in FLAGGED_RESOURCE_REASONS) {
                            $('.showProblematicReasons', element).show().attr('aria-hidden', 'false');
                            reasons = FLAGGED_RESOURCE_REASONS[resourceId].join(reasonSeparator);
                        }
                        if (reasons != '') { $('.showProblematicReasons', element).html(problematicReasonsPrefix + reasons); }
                        else { $('.showProblematicReasons', element).html(''); }
                    }

                    $('.showEndorsedReasons', element).hide().attr('aria-hidden', 'true');
                    if ($('.endorse', this).hasClass('endorsed')) {
                        var reasons = $('.recommenderEndorseReason', this).text();
                        if (reasons != '') { $('.showEndorsedReasons', element).html(endorsedReasonsPrefix + reasons); }
                        else { $('.showEndorsedReasons', element).html(''); }
                        $('.showEndorsedReasons', element).show().attr('aria-hidden', 'false');
                    }
                }

                Logger.log('mit.recommender.hover', generateLog(loggerStatus['hover']['hover'], {'id': $('.recommenderEntryId', this).text()}));
            }, function() {
            }
        );
    }

    /**
     * Check whether enough information (title/url) is provided for editing a resource, if yes, enable summission button.
     */
    function enableEditSubmit() {
        if ($('.editTitle', element).val() == '' || $('.editUrl', element).val() == '') {
            $('.editSubmit', element).attr('disabled', true);
            return;
        }
        $('.editSubmit', element).attr('disabled', false);
    }
    
    /**
     * Submit the edited resource, write the resource to the database, and update the current view of resource.
     * @param {dictionary} data The resource to be edited.
     */
    function editResource(data) {
        $.ajax({
            type: "POST",
            url: editResourceUrl,
            data: JSON.stringify(data),
            success: function(result) {
                if (result['Success'] == true) {
                    var resourceDiv = $('.recommenderResource:eq(' + findResourceDiv(result['old_id']).toString() + ')', element);
                    /* Update the edited resource */
                    $('.recommenderTitle', resourceDiv).find('a').text(result['title']);
                    $('.recommenderTitle', resourceDiv).find('a').attr('href', result['url']);
                    $('.recommenderEntryId', resourceDiv).text(result['id']);
                    if (data["description"] != "") { $('.recommenderDescriptionImg', resourceDiv).text(result['description']); }
                    if (data["descriptionText"] != "") { $('.recommenderDescriptionText', resourceDiv).text(result['descriptionText']); }
                    backToView();
                }
                else { alert(result['error']); }
            }
        });
    }
    
    /**
     * Bind the event for editing an existing resource.
     * @param {element} ele The recommenderResource element the edit event will be bound to.
     */
    function bindResourceEditEvent(ele) {
        $('.resourceEditButton', ele).click(function() {
            showModifyingPage('.editResourcePage')
            var resourceDiv = $(this).parent().parent();
    
            /* data: resource to be submitted to database */
            var data = {};
            data['id'] = $('.recommenderEntryId', resourceDiv).text();
    
            /* Initialize resource edit mode */
            $('.editTitle', element).val($('.recommenderTitle', resourceDiv).find('a').text());
            $('.editUrl', element).val($('.recommenderTitle', resourceDiv).find('a').attr('href'));
            $('.editDescriptionText', element).val($('.recommenderDescriptionText', resourceDiv).text());
            $('.editResourceForm', element).find("input[name='file']").val('');
            $('.editSubmit', element).attr('disabled', true);
    
            Logger.log('mit.recommender.editResource', generateLog(loggerStatus['editResource']['attempt'], {'id': data['id']}));
    
            /* If the input (text) area is changed, or a new file is uploaded, check whether user provides enough information to submit the resource */
            $('.editTitle,.editUrl,.editDescriptionText', element).unbind();
            $('.editTitle,.editUrl,.editDescriptionText', element).bind('input propertychange', function() { enableEditSubmit(); });
            $('.editResourceForm', element).find("input[name='file']").unbind();
            $('.editResourceForm', element).find("input[name='file']").change(function() {
                if ($(this).val() != '') { enableEditSubmit(); }
            });
            
            /* Add tooltips for editting page */
            addTooltipPerCats(tooltipsEditCats);

            /* Upload the screenshot, edit the resource in the database, and update the resource list */
            $('.editSubmit', element).unbind();
            $('.editSubmit', element).click(function() {
                /* data: resource to be submitted to database */
                data['url'] = $('.editUrl', element).val();
                data['title'] = $('.editTitle', element).val();
                data['descriptionText'] = $('.editDescriptionText', element).val();
                data['description'] = ''
                if (data['url'] == '' || data['title'] == '') { return; }
                var formDiv = $('.editResourceForm', element);
                var file = new FormData($(formDiv)[0]);

                var information = $.extend({}, data);
                information['description'] = $("input[name='file']", formDiv).val();
                Logger.log('mit.recommender.editResource', generateLog(loggerStatus['editResource']['complete'], information));

                /* Edit resource when the screenshot isn't/is provided */
                if ($("input[name='file']", formDiv).val() == '') { editResource(data); }
                else { writeResourceWithScreenshot(formDiv, file, writeDatabaseEnum.EDIT, data); }
            });
        });
    }

    /** 
     * Bind the event for flagging problematic resource and submitting the
     * reason why student think the resource is problematic.
     * @param {element} ele The recommenderResource element the flag event will be bound to.
     */
    function bindResourceFlagEvent(ele) {
        $('.flagResource', ele).click(function() {
            showModifyingPage('.flagResourcePage')

            var flagDiv = $(this);
            var flaggedResourceDiv = $(this).parent().parent();
            $('.flagReason', element).val($('.recommenderProblematicReason', flaggedResourceDiv).text());
            data = {};
            data['id'] = $('.recommenderEntryId', flaggedResourceDiv).text();
            Logger.log('mit.recommender.flagResource', generateLog(loggerStatus['flagResource']['attempt'], {'id': data['id']}));

            $('.flagReasonSubmit', element).unbind();
            $('.unflagButton', element).unbind();

            /* Flag the problematic resource and save the reason to database */ 
            $('.flagReasonSubmit', element).click(function() {
                data['reason'] = $('.flagReason', element).val();
                data['isProblematic'] = true;
                Logger.log('mit.recommender.flagResource', generateLog(loggerStatus['flagResource']['complete'], data));

                $.ajax({
                    type: "POST",
                    url: flagResourceUrl,
                    data: JSON.stringify(data),
                    success: function(result) {
                        var flaggedResourceDiv = $('.recommenderResource:eq(' + findResourceDiv(result['id']).toString() + ')', element);
                        var flagDiv = $('.flagResource:eq(' + findResourceDiv(result['id']).toString() + ')', element);
        
                        $('.recommenderProblematicReason', flaggedResourceDiv).text(result['reason']);
                        if (result['isProblematic']) { $(flagDiv).addClass('problematic'); }
                        else { $(flagDiv).removeClass('problematic'); }
                        addResourceDependentTooltip(flaggedResourceDiv);
                        setFlagAriaParam(flaggedResourceDiv);
                        backToView();
                    }
                });
            });

            /* Unflag the resource */
            $('.unflagButton', element).click(function() {
                data['isProblematic'] = false;
                Logger.log('mit.recommender.flagResource', generateLog(loggerStatus['flagResource']['unflag'], data));
            
                $.ajax({
                    type: "POST",
                    url: flagResourceUrl,
                    data: JSON.stringify(data),
                    success: function(result) {
                        var flaggedResourceDiv = $('.recommenderResource:eq(' + findResourceDiv(result['id']).toString() + ')', element);
                        var flagDiv = $('.flagResource:eq(' + findResourceDiv(result['id']).toString() + ')', element);
        
                        $('.recommenderProblematicReason', flaggedResourceDiv).text(result['reason']);
                        if (result['isProblematic']) { $(flagDiv).addClass('problematic'); }
                        else { $(flagDiv).removeClass('problematic'); }
                        addResourceDependentTooltip(flaggedResourceDiv);
                        setFlagAriaParam(flaggedResourceDiv);
                        backToView();
                    }
                });
            });
        });
    }

    /**
     * Bind events to the given resource.
     * 1. Upvote/Downvote
     * 2. Hover
     * 3. Edit
     * 4. Flag
     * @param {element} ele The recommenderResource element the events will be bound to.
     */
    function bindResourceDependentEvent(ele) {
        bindResourceVoteEvent(voteTypeEnum.UPVOTE, ele);
        bindResourceVoteEvent(voteTypeEnum.DOWNVOTE, ele);
        bindResourceHoverEvent(ele);
        bindResourceEditEvent(ele);
        bindResourceFlagEvent(ele);

        /* Log the event of students' clicking on a resource */
        $('a', ele).click(function() {
            Logger.log('mit.recommender.clickResource', generateLog(
                loggerStatus['clickResource']['clickResource'],
                {'id': $('.recommenderEntryId', ele).text()}
            ));
        });

        setVoteAriaParam(ele);
        setFlagAriaParam(ele);
        setEndorseAriaParamForStudent(ele);
    }

    /**
     * Generate configuration of tooltips.
     * @param {string} tooltipContent The text and span element of tooltips.
     * @returns {dictionary} The configuration of tooltips.
     */
    function generateTooltipConfig(tooltipContent) {
        return {
            content: $(tooltipContent), theme: '.my-custom-theme', maxWidth: '300'
        };
    }

    /**
     * Add tooltips to elements which are not resource-dependent.
     */
    function addTooltip() {
        tooltipsCats.forEach(function(cat, ind) {
            var classes = cat.split(".");
            try { $("." + classes[1], element).tooltipster('destroy'); }
            catch (e) {  }
        });
        tooltipsCats.forEach(function(cat, ind) {
            var classes = cat.split(".");
            try {
                if (classes.length == 3 && (! $("." + classes[1], element).hasClass(classes[2]) )) {
                    $("." + classes[1], element).tooltipster(generateTooltipConfig(tooltipsCatsText["." + classes[1]]));
                    return;
                }
                if ($(cat, element).hasClass('tooltipstered')) { return; }
                $(cat, element).tooltipster(generateTooltipConfig(tooltipsCatsText[cat])); 
            }
            catch (e) {  }
        });
     }

    /**
     * Add tooltips to an array of elements.
     * @param {string array} cats An string array where each string indicating the element we are going to add tooltips to.
     */
    function addTooltipPerCats(cats) {
        cats.forEach(function(cat, ind) {
            try { $(cat, element).tooltipster('destroy'); }
            catch (e) { }
        });
        cats.forEach(function(cat, ind) {
            try { $(cat, element).tooltipster(generateTooltipConfig(tooltipsCatsText[cat])); }
            catch (e) { }
        });
     }

    /**
     * Add resource-dependent tooltips to the given resource.
     * @param {element} ele The recommenderResource element the tooltips will be added to.
     */
    function addResourceDependentTooltip(ele) {
        tooltipsCatsPerResource.forEach(function(cat, ind) {
            var classes = cat.split(".");
            if (classes.length == 3) {
                try { $(ele, element).find("." + classes[1]).tooltipster('destroy'); }
                catch (e) { }
            }
        });
        tooltipsCatsPerResource.forEach(function(cat, ind) {
            var classes = cat.split(".");
            try {
                if (classes.length == 3 && (! $(ele, element).find("." + classes[1]).hasClass(classes[2]) )) {
                    $(ele, element).find("." + classes[1]).tooltipster(generateTooltipConfig(tooltipsCatsText["." + classes[1]]));
                    return;
                }
                $(ele, element).find(cat).tooltipster(generateTooltipConfig(tooltipsCatsText[cat]));
            }
            catch (e) { }
        });
     }

    /**
     * Find the position (index of div) of a resource based on its resource Id.
     * @param {string} resourceId The resource Id.
     * @returns {Number} The position (index) of the resource.
     */
    function findResourceDiv(resourceId) {
        index = -1;
        $('.recommenderEntryId', element).each(function(idx, ele){
            if ($(ele).text() == resourceId) {
                index = idx;
                return false;
            }
        });
        return index;
    }

    /**
     * Bind course-staff-limited events.
     */
    function bindStaffLimitedEvent() {
        if (IS_USER_STAFF) {
            if (!DISABLE_DEV_UX) { toggleDeendorseMode(); }
            $('.recommenderResource', element).each(function(index, ele) {
                bindStaffLimitedResourceDependentEvent(ele);
                addResourceDependentTooltip(ele);
            });
            $('.resourceImportButton', element).show().attr('aria-hidden', 'false');
        }
    }
    
    /**
     * This is a function restricted to course staff, where we can toggle between viewing mode for deendorsement and
     * ordinary browsing
     * Deendorsement mode:
     *      Re-rank resources by first showing flagged resource, then non-flagged one in the order of increasing votes
     *      Show the reason and accumulated flagged result
     * Ordinary mode:
     *      Rank resources in the order of decreasing votes
     */
    function toggleDeendorseMode() {
        $('.resourceRankingForDeendorsementButton', element).show().attr('aria-hidden', 'false');
        $('.resourceRankingForDeendorsementButton', element).click(function() {
            $(this).toggleClass('deendorsementMode');
            addTooltip();
            if ($(this).hasClass('deendorsementMode')) {
                $.ajax({
                    type: "POST",
                    url: getAccumFlaggedResourceUrl,
                    data: JSON.stringify({}),
                    success: function(result) {
                        if (result['Success']) {
                            FLAGGED_RESOURCE_REASONS = result['flagged_resources'];
                            var startEntryIndex = 0;
                            for (var key in FLAGGED_RESOURCE_REASONS) {
                                var resourcePos = findResourceDiv(key);
                                if (startEntryIndex != resourcePos) {
                                    $('.recommenderResource:eq(' + startEntryIndex + ')', element).before($('.recommenderResource:eq(' + resourcePos + ')', element));
                                }
                                startEntryIndex++;
                            }

                            sortResource(sortResourceEnum.INCREASE, startEntryIndex);
                            paginationItem();
                            pagination();
                        }
                        else { alert(result['error']); }
                    }
                });
            }
            else {
                sortResource(sortResourceEnum.DECREASE, 0);
                paginationItem();
                pagination();
                if (!DISABLE_DEV_UX) { $('.showProblematicReasons', element).hide().attr('aria-hidden', 'true'); }
                FLAGGED_RESOURCE_REASONS = {};
            }
        });
    }
    
    /**
     * Sort resources by their votes.
     * @param {string} mode The string indicating the resources are sorted in increasing or descreasing order.
     * @param {number} startEntryIndex The position (index) of the first resource to be sorted.
     */
    function sortResource(mode, startEntryIndex) {
        if (startEntryIndex < 0) { return; }
        for (index = startEntryIndex; index < $('.recommenderResource', element).length - 1; index++) {
            var optimalIdx = index;
            var optimalValue = parseInt($('.recommenderResource:eq(' + optimalIdx + ')', element).find('.recommenderVoteScore').text())
            for (index2 = index + 1; index2 < $('.recommenderResource', element).length; index2++) {
                var currentValue = parseInt($('.recommenderResource:eq(' + index2 + ')', element).find('.recommenderVoteScore').text())
                if (mode == sortResourceEnum.INCREASE) {
                    if (currentValue < optimalValue){
                        optimalValue = currentValue;
                        optimalIdx = index2;
                    }
                }
                else {
                    if (currentValue > optimalValue){
                        optimalValue = currentValue;
                        optimalIdx = index2;
                    }
                }
            }
            if (index == optimalIdx) { continue; }
            /* Move div */
            $('.recommenderResource:eq(' + index + ')', element).before($('.recommenderResource:eq(' + optimalIdx + ')', element));
        }
    }

    /**
     * Bind the event for endorsing/unendorsing a resource and submitting the
     * reason why the staff think the resource should be endorsed.
     * @param {element} ele The recommenderResource element the event will be bound to.
     */
    function bindResourceEndorseEvent(ele) {
        $('.endorse', ele).show().attr('aria-hidden', 'false');
        $('.endorse', ele).click(function() {
            var data = {};
            data['id'] = $(this).parent().parent().find('.recommenderEntryId').text();
            
            if ($(this).hasClass('endorsed')) {
                /* Undo the endorsement of a selected resource */
                callEndorseHandler(data);
            }
            else {
                showModifyingPage('.endorsePage')
                $('.endorsePage', element).find('input[type="text"]').val('');
                $('.endorseResource', element).unbind();
                /* Endorse a selected resource */
                $('.endorseResource', element).click(function() {
                    data['reason'] = $('.endorseReason', element).val();
                    /* Endorse a selected resource */
                    callEndorseHandler(data);
                });
            }
        });
    }

    /**
     * Call the handler for endorsement with the provided data and update the resource list.
     * @param {dictionary} data The information sent to the handler.
     */
    function callEndorseHandler(data) {
        if (endorseFlag in data) {
            Logger.log('mit.recommender.endorseResource', generateLog(loggerStatus['endorseResource']['endorse'], data));
        }
        else {
            Logger.log('mit.recommender.endorseResource', generateLog(loggerStatus['endorseResource']['unendorse'], data));
        }
        $.ajax({
            type: "POST",
            url: endorseResourceUrl,
            data: JSON.stringify(data),
            success: function(result) {
                if (result['Success']) {
                    var endorsedResourceIdx = findResourceDiv(result['id']);
                    var endorsedDiv = $('.recommenderResource:eq(' + endorsedResourceIdx.toString() + ')', element);
                    $('.endorse', endorsedDiv).toggleClass('endorsed').show().attr('aria-hidden', 'false');
                    addResourceDependentTooltip(endorsedDiv);
                    setEndorseDeendorseAriaParam(endorsedDiv);
                    if (endorseFlag in result) {
                        $('.recommenderEndorseReason', endorsedDiv).text(result['reason']);
                        backToView();
                    }
                    else { $('.recommenderEndorseReason', endorsedDiv).text(''); }
                }
                else { alert(result['error']); }
            }
        });
    }

    /**
     * Bind the event for deendorsing a resource and submitting the
     * reason why the staff think the resource should be deendorsed.
     * @param {element} ele The recommenderResource element the event will be bound to.
     */
    function bindResourceDeendorseEvent(ele) {
        if ($('.deendorse', ele).length == 0) { $('.recommenderEdit', ele).append(deendorseIcon); }
                    
        /* Enter deendorse mode */
        $('.deendorse', ele).click(function() {
            showModifyingPage('.deendorsePage')
            $('.deendorsePage', element).find('input[type="text"]').val('');
            var data = {};
            data['id'] = $(this).parent().parent().find('.recommenderEntryId').text();
            
            $('.deendorseResource', element).unbind();
            /* Deendorse a selected resource */
            $('.deendorseResource', element).click(function() {
                data['reason'] = $('.deendorseReason', element).val();
                Logger.log('mit.recommender.deendorseResource', generateLog(loggerStatus['deendorseResource']['deendorseResource'], data));
                $.ajax({
                    type: "POST",
                    url: deendorseResourceUrl,
                    data: JSON.stringify(data),
                    success: function(result) {
                        if (result['Success']) {
                            var deletedResourceIdx = findResourceDiv(result['id']);
                            $('.recommenderResource:eq(' + deletedResourceIdx.toString() + ')', element).remove();
                            /* Deendorse (remove) last resource */
                            if ($('.recommenderResource', element).length == deletedResourceIdx) { deletedResourceIdx--; }
                            CURRENT_PAGE = Math.ceil((deletedResourceIdx + 1)/ENTRIES_PER_PAGE); 
                            paginationItem();
                            pagination();
                            backToView();
                        }
                        else { alert(result['error']); }
                    }
                });
            });
        });
    }

    /**
     * Bind course-staff-limited, resource-dependent events to the given resource.
     * @param {element} ele The recommenderResource element the events will be bound to.
     */
    function bindStaffLimitedResourceDependentEvent(ele) {
        bindResourceEndorseEvent(ele);
        bindResourceDeendorseEvent(ele);
        setEndorseDeendorseAriaParam(ele);
    }

    /**
     * Set the text of upvote/downvote buttons for accessibility.
     * @param {element} ele The recommenderResource element the buttons attached to.
     */
    function setVoteAriaParam(ele) {
        /* Reset aria-text for upvote/downvote button */
        $('.recommenderVoteArrowUp', ele).attr('aria-label', ariaLabelText['upvote']);
        $('.recommenderVoteArrowDown', ele).attr('aria-label', ariaLabelText['downvote']);
        /* Set aria-text for clicked upvote/downvote button */
        $('.recommenderVoteArrowUp.upvoting', ele).attr('aria-label', ariaLabelText['undoUpvote']);
        $('.recommenderVoteArrowDown.downvoting', ele).attr('aria-label', ariaLabelText['undoDownvote']);
    }

    /**
     * Set the text of flag buttons for accessibility.
     * @param {element} ele The recommenderResource element the button attached to.
     */
    function setFlagAriaParam(ele) {
        $('.flagResource.problematic', ele).attr('aria-label', ariaLabelText['problematicResource']);
    }

    /**
     * Set the text of endorse buttons for accessibility, when users are not staff.
     * @param {element} ele The recommenderResource element the button attached to.
     */
    function setEndorseAriaParamForStudent(ele) {
        if (!IS_USER_STAFF) { $('.endorsed', ele).attr('aria-label', ariaLabelText['endorsedResource']); }
    }

    /**
     * Set the text of endorse/deendorse buttons for accessibility, these
     * buttons are limited to staff.
     * @param {element} ele The recommenderResource element the buttons attached to.
     */
    function setEndorseDeendorseAriaParam(ele) {
        $('.endorse', ele).attr('role', 'button').attr('tabindex', '0');
        $('.deendorse', ele).attr('role', 'button').attr('tabindex', '0').attr('aria-label', ariaLabelText['deendorseResource']);;
        $('.endorse:not(.endorsed)', ele).attr('aria-label', ariaLabelText['endorseResource']);
        $('.endorse.endorsed', ele).attr('aria-label', ariaLabelText['undoEndorseResource']);
    }

    /**
     * Initialize the recommender by first setting the configuration variables and then rendering the web page.
     */
    function initializeRecommender() {
        /* Set configuration variables */
        FLAGGED_RESOURCE_REASONS = {};
        DISABLE_DEV_UX = init_data['DISABLE_DEV_UX'];
        CURRENT_PAGE = init_data['CURRENT_PAGE'];
        ENTRIES_PER_PAGE = init_data['ENTRIES_PER_PAGE'];
        PAGE_SPAN = init_data['PAGE_SPAN'];
        IS_USER_STAFF = init_data['IS_USER_STAFF'];
        /* Render the initial web page */
        renderInitialPage();

        if (init_data['INTRO']){
            introJs().start();
        }
    }

    /**
     * Render the initial web page.
     */
    function renderInitialPage() {
        /* Bind the list expansion or collapse event to the resource header */
        $(".hideShow", element).click(bindToggleResourceListEvent);

        /* Bind the resource export event */
        $('.resourceExportButton', element).click(bindExportResourceEvent);

        /* Bind the resource import event */
        $('.resourceImportButton', element).click(bindImportResourceEvent);

        /* Bind the submission interruption event */
        $('.backToViewButton', element).click(bindInterruptSubmissionEvent);

        bindResourceAddEvent();
        backToView();
        addTooltip();
        bindStaffLimitedEvent();
        
        paginationItem();
        pagination();
        resetAddResourcePage();
        $('.recommenderResource', element).each(function(index, ele) {
            bindResourceDependentEvent(ele);
            addResourceDependentTooltip(ele);
        });
        addTooltip();
    
        if ($('.recommenderResource', element).length == 0) {
            $('.noResourceIntro', element).show().attr('aria-hidden', 'false');
            $('.descriptionText', element).hide().attr('aria-hidden', 'true');
        }
    }
    initializeRecommender();
}
