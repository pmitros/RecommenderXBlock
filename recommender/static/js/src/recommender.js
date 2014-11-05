if (typeof Logger == 'undefined') {
    var Logger = {
        log: function(a) { return; }
    }
}


function RecommenderXBlock(runtime, element) {
    /* Grab URLs from server */
    var handleUpvoteUrl = runtime.handlerUrl(element, 'handle_upvote');
    var handleDownvoteUrl = runtime.handlerUrl(element, 'handle_downvote');
    var addResourceUrl = runtime.handlerUrl(element, 'add_resource');
    var editResourceUrl = runtime.handlerUrl(element, 'edit_resource');
    var flagResourceUrl = runtime.handlerUrl(element, 'flag_resource');
    var uploadScreenshotUrl = runtime.handlerUrl(element, 'upload_screenshot');
    var deendorseResourceUrl = runtime.handlerUrl(element, 'deendorse_resource');
    var endorseResourceUrl = runtime.handlerUrl(element, 'endorse_resource');
    var getAccumFlaggedResourceUrl = runtime.handlerUrl(element, 'get_accum_flagged_resource');
    var getClientSideSettingsUrl = runtime.handlerUrl(element, 'get_client_side_settings');

    /* Define global feature flags and setting variables */
    var DISABLE_DEV_UX, CURRENT_PAGE, ENTRIES_PER_PAGE, PAGE_SPAN, IS_USER_STAFF, FLAGGED_RESOURCE_REASONS;


    function toggle_resource_list() {
	/* Generally, triggered when clicking on the header of the resource list. */
        if ($(this).hasClass('resourceListExpanded')) {
            /* Initiate at least once for every session */
            Logger.log('hideShow.click.event', {
                'status': 'hide',
                'element': $(element).attr('data-usage-id')
            });
            $(".recommenderRowInner", element).slideUp('fast');
        }
        else {
            Logger.log('hideShow.click.event', {
                'status': 'show',
                'element': $(element).attr('data-usage-id')
            });
            $(".recommenderRowInner", element).slideDown('fast');
        }
        $(this).toggleClass('resourceListExpanded');
        addTooltip();
    }

    /* Show or hide resource list on click on the header*/
    $(".hideShow", element).click(toggle_resource_list);

    /* Show resources and page icons for different pages */
    function pagination() {
        /* Show resources for each page */
        $('.recommenderResource', element).each(function(index, ele) {
            if (index < (CURRENT_PAGE-1)*ENTRIES_PER_PAGE || index >= CURRENT_PAGE*ENTRIES_PER_PAGE) { $(ele, element).hide(); }
            else { $(ele, element).show(); }
        });

        /* Show page icons for each page */
        $('.paginationItem', element).each(function(index, ele) {
            if (index + 1 == CURRENT_PAGE) { $(ele, element).show(); }
            else { $(ele, element).hide(); }
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
            var logStudentInput = 'From page ' + CURRENT_PAGE.toString();
            if ($(this).hasClass('morePageIcon')) {
                Logger.log('pagination.click.event', {
                    'status': 'Click on morePageIcon',
                    'element': $(element).attr('data-usage-id')
                });
                return;
            }
            else if ($(this).hasClass('previousPageIcon')) {
                CURRENT_PAGE -= 1;
            }
            else if ($(this).hasClass('nextPageIcon')) { CURRENT_PAGE += 1; }
            else { CURRENT_PAGE = parseInt($(this).text()); }
            logStudentInput += ' To page ' + CURRENT_PAGE.toString();
            Logger.log('pagination.click.event', {
                'status': logStudentInput,
                'element': $(element).attr('data-usage-id')
            });
            pagination();
        });
    }
    
    /**
     * Switch from pages of resource addition/edit/flag/staff-edit to pages listing resources.
     */
    function backToView() {
	modals = ['.recommenderModify','.flagResourcePage','.editResourcePage','.addResourcePage','.deendorsePage','.endorsePage']
        for(i=0; i<modals.length; i++){
	    $(modals[i], element).hide();
        }

        if ($('.recommenderResource', element).length == 0) {
            $('.noResourceIntro', element).removeClass('hidden');
        }
        $('.recommenderResource', element).removeClass('resourceHovered');
        $('.previewingImg', element).addClass('hidden');
        $('.descriptionText', element).hide();
        if (!DISABLE_DEV_UX) {
            $('.showProblematicReasons', element).addClass('hidden');
            $('.showEndorsedReasons', element).addClass('hidden');
        }
        $('.recommenderContent', element).show();
    }

    /**
     * Bind event to backToViewButton for switching from pages of resource
     * addition/edit/flag/staff-edit to pages listing resources.
     */
    $('.backToViewButton', element).click(function() {
        var divs = $('.flagResourcePage, .editResourcePage, .addResourcePage, .deendorsePage, .endorsePage', element);
        function findActivePage() {
            for (var key in divs) {
                if ($(divs[key]).attr('style') != "display: none;") { return divs[key]; }
            }
        }
        var activePage = findActivePage();
        
        var logStudentInput = {'status': 'Back to resource list mode', 'element': $(element).attr('data-usage-id')};
        function getTypedContent(selector) {
            if ($(activePage).find(selector).length != 0) {
                $(activePage).find(selector).each(function() {
                    logStudentInput[$(this).attr('class').replace('tooltipstered', '').trim()] = $(this).val();
                });
            }
        }
        getTypedContent('textarea');
        getTypedContent('input[type="text"]');
        getTypedContent('input[type="file"]');
        Logger.log('backToView.click.event', logStudentInput);

        var canGoBackToView = true;
        if ($(activePage).find('input[type="button"]:disabled').length == 0) {
            canGoBackToView = confirm('The content you typed has not been submitted yet. Are you sure to go back?')
        }
        if (canGoBackToView) { backToView(); }
    });
    
    /* Enter resource addition mode */
    $('.resourceAddButton', element).click(function() {
        Logger.log('addResource.click.event', {
            'status': 'Entering add resource mode',
            'element': $(element).attr('data-usage-id')
        });
    
        addResourceReset();
        $('.addResourcePage', element).show();
        $('.recommenderContent', element).hide();
        $('.recommenderModify', element).show();
        $('.recommenderModifyTitle', element).text('Suggest resource');
    });

    /* Initialize resource addition mode */
    function addResourceReset() {
        $('.addResourcePage', element).find('input[type="text"]').val('');
        $('.addResourcePage', element).find('textarea').val('')
        $('.addResourceForm', element).find("input[name='file']").val('');
        $('.addSubmit', element).attr('disabled', true);
    }

    /* Check whether enough information (title/url) is provided for recommending a resource, if yes, enable summission button */
    function enableAddSubmit() {
        if ($('.inTitle', element).val() == '' || $('.inUrl', element).val() == '') {
            $('.addSubmit', element).attr('disabled', true);
            return;
        }
        $('.addSubmit', element).attr('disabled', false);
    }

    /* If the input (text) area is changed, check whether user provides enough information to submit the resource */
    $('.inTitle,.inUrl,.inDescriptionText', element).bind('input propertychange', function() { enableAddSubmit(); });
    $('.addResourceForm', element).find("input[name='file']").change(function() {
        if ($(this).val() != '') { enableAddSubmit(); }
    });

    /* Upload the screenshot, submit the new resource, save the resource in the database, and update the current view of resource */
    $('.addSubmit', element).click(function() {
        /* data: resource to be submitted to database */
        var data = {};
        data['url'] = $('.inUrl', element).val();
        data['title'] = $('.inTitle', element).val();
        data['descriptionText'] = $('.inDescriptionText', element).val();
        data['description'] = '';
        var formDiv = $('.addResourceForm', element);
        var file = new FormData($(formDiv)[0]);
        Logger.log('addResource.click.event', {
            'status': 'Add new resource',
            'title': data['title'],
            'url': data['url'],
            'description': $(formDiv).find("input[name='file']").val(),
            'descriptionText': data['descriptionText'],
            'element': $(element).attr('data-usage-id')
        });
        
        /* Add resource when the screenshot isn't/is provided */
        if ($(formDiv).find("input[name='file']").val() == '') { addResource(data); }
        else { writeResourceWithScreenshot(formDiv, file, 'add', data); }
    });

    /**
     * Upload the screenshot of resource before writing (adding/editing) the
     * submitted resource to database.
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
            /* WANRING: I DON'T KNOW WHY IT ALWAYS ACTIVATES ERROR (COMPLETE) EVENT, INSTEAD OF SUCCESS, ALTHOUGH IT ACTIVATES SUCCESS CORRECTLY IN XBLOCK-SDK */
            complete: function(result) {
                /* File uploading error:
                   1. Wrong file type is provided; accept files only in jpg, png, and gif
                   2. The configuration of Amazon S3 is not properly set
                   3. Size of uploaded file exceeds threshold
                */
                for (var key in uploadFileError) {
                    if (result.responseText.indexOf(uploadFileError[key]) == 0) {
                        alert(uploadFileErrorText[uploadFileError[key]]);
                        $(formDiv).find("input[name='file']").val('');
                        if (writeType == 'add') { enableAddSubmit(); }
                        else if (writeType == 'edit') { enableEditSubmit(); }
                        else { return; }
                    }
                }
                /* Submit the written resource */
                data['description'] = result.responseText;
                if (writeType == 'add') { addResource(data); }
                else if (writeType == 'edit') { editResource(data); }
                else { return; }
            },
        });
    }
    
    /**
     * Submit the new resource, save the resource in the database, and update the current view of resource
     * data: resource to be submitted to database 
     */
    function addResource(data) {
        $.ajax({
            type: "POST",
            url: addResourceUrl,
            data: JSON.stringify(data),
            success: function(result) {
                if (result['Success'] == true) {
                    /* Decide the rigth place for the added resource (pos), based on sorting the votes */
                    var pos = -1;
                    $('.recommenderVoteScore', element).each(function(idx, ele){ 
                        if (parseInt($(ele).text()) < 0) {
                            pos = idx;
                            return false;
                        }
                    });

                    /* Show the added resource at right place (pos), based on sorting the votes, and lead student to that page */
                    if ($('.recommenderResource', element).length == 0) {
                        $('.noResourceIntro', element).addClass('hidden');
                        $('.descriptionText', element).show();
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
                        resourceUrl: result['url'],
                        resourceTitle: result['title'],
                        resourceImg: result['description'],
                        resourceText: result['descriptionText'],
                        resourceId: result['id']
                    }

                    var newDiv = $(Mustache.render($("#recommenderResourceTemplate").html(), renderData));
                    bindEvent(newDiv);
                    if (IS_USER_STAFF) { addFunctionsForStaffPerResource(newDiv); }

                    if ($('.recommenderResource', element).length == 0) {
                        $('.noResourceIntro', element).after(newDiv);
                    }
                    else {
                        if (pos == -1) { $(toDiv).after(newDiv); }
                        else { $(toDiv).before(newDiv); }
                    }
                    addTooltipPerResource(newDiv);
                    addResourceReset();
                    paginationItem();
                    pagination();
                    backToView();
                }
                else {
                    alert(result['error']);
                }
            }
        });
    }

    /**
     * Bind upvote/downvote event for each resource
     */
    function bindResourceVoteEvent(voteType, ele) {
        var options = {}
        if (voteType == 'upvote') {
            options['buttonClassName'] = 'recommenderVoteArrowUp';
            options['eventName'] = 'arrowUp';
            options['url'] = handleUpvoteUrl;
            options['voteClassName'] = 'upvoting';
            options['previousVoteClassName'] = 'downvoting';
        }
        else if (voteType == 'downvote') {
            options['buttonClassName'] = 'recommenderVoteArrowDown';
            options['eventName'] = 'arrowDown';
            options['url'] = handleDownvoteUrl;
            options['voteClassName'] = 'downvoting';
            options['previousVoteClassName'] = 'upvoting';
        }
        else { return; }
        
        $('.' + options['buttonClassName'], ele).click(function() {
            var data = {};
            data['id'] = parseInt($(this).parent().parent().find('.recommenderEntryId').text());
            if (data['id'] == -1) { return; }
            Logger.log('mit.recommender.' + options['eventName'] + '.click.event', {
                'status': options['eventName'],
                'id': data['id'],
                'element': $(element).attr('data-usage-id')
            });
            
            $.ajax({
                type: "POST",
                url: options['url'],
                data: JSON.stringify(data),
                success: function(result) {
                    if (result['Success'] == true) {
                        var resource = $('.recommenderResource:eq(' + findResourceDiv(result['id']).toString() + ')', element);
                        $(resource)
                            .find('.recommenderVoteArrowUp, .recommenderVoteArrowDown, .recommenderVoteScore')
                            .toggleClass(options['voteClassName']);
                        if ('toggle' in result) {
                            $(resource)
                                .find('.recommenderVoteArrowUp, .recommenderVoteArrowDown, .recommenderVoteScore')
                                .toggleClass(options['previousVoteClassName']);
                        }
                        $(resource).find('.recommenderVoteScore').html(result['newVotes'].toString());
                    }
                    else {
                        alert(result['error']);
                    }
                }
            });
        });
    }
    
    /**
     * Show preview image and description of a resource when hovering over it.
     */
    function bindResourceHoverEvent(ele) {
        $(ele).hover(
            function() {
                $('.recommenderResource', element).removeClass('resourceHovered');
                $(this).addClass('resourceHovered');

                $('.descriptionText', element).hide();
                $('.descriptionText', element).text($(this).find('.recommenderDescriptionText').text());                
                if ($('.descriptionText', element).text() != '') { $('.descriptionText', element).show(); }

                $('.previewingImg', element).removeClass('hidden');
                $('.previewingImg', element).attr('src', $(this).find('.recommenderDescriptionImg').text());
                $(".previewingImg", element).error(function() { $('.previewingImg', element).addClass('hidden'); });
                if ($('.previewingImg', element).attr('src') == '') { $('.previewingImg', element).addClass('hidden'); }

                if (!DISABLE_DEV_UX) {
                    $('.showProblematicReasons', element).addClass('hidden');
                    if (!$.isEmptyObject(FLAGGED_RESOURCE_REASONS)) {
                        var resourceId = parseInt($(this).find('.recommenderEntryId').text());
                        var reasons = '';
                        /**
                         * FLAGGED_RESOURCE_REASONS is empty except that user is course staff.
                         * Therefore, the content in showProblematicReasons will be showed only to staff.
                         */
                        if (resourceId in FLAGGED_RESOURCE_REASONS) {
                            $('.showProblematicReasons', element).removeClass('hidden');
                            reasons = FLAGGED_RESOURCE_REASONS[resourceId].join(reasonSeparator);
                        }
                        if (reasons != '') { $('.showProblematicReasons', element).html(problematicReasonsPrefix + reasons); }
                        else { $('.showProblematicReasons', element).html(''); }
                    }

                    $('.showEndorsedReasons', element).addClass('hidden');
                    if ($(this).find('.endorse').hasClass('endorsed')) {
                        var reasons = $(this).find('.recommenderEndorseReason').text();
                        if (reasons != '') { $('.showEndorsedReasons', element).html(endorsedReasonsPrefix + reasons); }
                        else { $('.showEndorsedReasons', element).html(''); }
                        $('.showEndorsedReasons', element).removeClass('hidden');
                    }
                }

                Logger.log('resource.hover.event', {
                    'status': 'Hovering resource',
                    'id': $(this).find('.recommenderEntryId').text(),
                    'element': $(element).attr('data-usage-id')
                });
            }, function() {
            }
        );
    }
    
    /**
     * Bind the event for editing an existing resource.
     */
    function bindResourceEditEvent(ele) {
        $(ele).find('.resourceEditButton').click(function() {
            $('.editResourcePage', element).show();
            $('.recommenderContent', element).hide();
            $('.recommenderModify', element).show();
            $('.recommenderModifyTitle', element).text('Edit existing resource');
            var resourceDiv = $(this).parent().parent();
    
            /* data: resource to be submitted to database */
            var data = {};
            data['id'] = parseInt(resourceDiv.find('.recommenderEntryId').text());
    
            /* Initialize resource edit mode */
            $('.editTitle', element).val(resourceDiv.find('.recommenderTitle').find('a').text());
            $('.editUrl', element).val(resourceDiv.find('.recommenderTitle').find('a').attr('href'));
            $('.editDescriptionText', element).val(resourceDiv.find('.recommenderDescriptionText').text());
            $('.editResourceForm', element).find("input[name='file']").val('');
            $('.editSubmit', element).attr('disabled', true);
    
            Logger.log('editResource.click.event', {
                'status': 'Entering edit resource mode',
                'id': data['id'],
                'element': $(element).attr('data-usage-id')
            });
    
            /* If the input (text) area is changed, or a new file is uploaded, check whether user provides enough information to submit the resource */
            $('.editTitle,.editUrl,.editDescriptionText', element).unbind();
            $('.editTitle,.editUrl,.editDescriptionText', element).bind('input propertychange', function() { enableEditSubmit(); });
            $('.editResourceForm', element).find("input[name='file']").unbind();
            $('.editResourceForm', element).find("input[name='file']").change(function() {
                if ($(this).val() != '') { enableEditSubmit(); }
            });
            
            /* Add tooltips for editting page */
            addTooltipPerCats(tooltipsEditCats);

            /* Upload the screen shot, submit the edited resource, save the resource in the database, and update the current view of resource */
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

                Logger.log('editResource.click.event', {
                    'status': 'Edit existing resource',
                    'title': data['title'],
                    'url': data['url'],
                    'descriptionText': data['descriptionText'],
                    'description': $(formDiv).find("input[name='file']").val(),
                    'id': data['id'],
                    'element': $(element).attr('data-usage-id')
                });

                /* Add resource when the screenshot isn't/is provided */
                if ($(formDiv).find("input[name='file']").val() == '') { editResource(data); }
                else { writeResourceWithScreenshot(formDiv, file, 'edit', data); }
            });
        });
    }

    /**
     * Check whether enough information (title/url) is provided for editing a resource, if yes, enable summission button 
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
     * data: resource which is going to be submitted to the database 
     */
    function editResource (data) {
        $.ajax({
            type: "POST",
            url: editResourceUrl,
            data: JSON.stringify(data),
            success: function(result) {
                if (result['Success'] == true) {
                    var resourceDiv = $('.recommenderResource:eq(' + findResourceDiv(result['id']).toString() + ')', element);
                    /* Update the edited resource */
                    resourceDiv.find('.recommenderTitle').find('a').text(result['title']);
                    resourceDiv.find('.recommenderTitle').find('a').attr('href', result['url']);
                    if (data["description"] != "") { resourceDiv.find('.recommenderDescriptionImg').text(result['description']); }
                    if (data["descriptionText"] != "") { resourceDiv.find('.recommenderDescriptionText').text(result['descriptionText']); }
                    backToView();
                }
                else { alert(result['error']); }
            }
        });
    }
    
    /** 
     * Bind the event for flagging problematic resource and submitting the
     * reason why student think the resource is problematic.
     */
    function bindResourceFlagEvent(ele) {
        $(ele).find('.flagResource').click(function() {
            $('.flagResourcePage', element).show();
            $('.recommenderContent', element).hide();
            $('.recommenderModify', element).show();
            $('.recommenderModifyTitle', element).text('Flag Resource');

            var flagDiv = $(this);
            var flaggedResourceDiv = $(this).parent().parent();
             $('.flagReason', element).val($(flaggedResourceDiv).find('.recommenderProblematicReason').text());
            data = {};
            data['id'] = parseInt($(flaggedResourceDiv).find('.recommenderEntryId').text());
          
            Logger.log('flagResource.click.event', {
                'status': 'Entering flag resource mode',
                'id': data['id'],
                'element': $(element).attr('data-usage-id')
            });

            $('.flagReasonSubmit', element).unbind();
            $('.unflagButton', element).unbind();

            /* Flag the problematic resource and save the reason to database */ 
            $('.flagReasonSubmit', element).click(function() {
                data['reason'] = $('.flagReason', element).val();
                data['isProblematic'] = true;
                Logger.log('flagResource.click.event', {
                    'status': 'Flagging resource',
                    'id': data['id'],
                    'reason': data['reason'],
                    'isProblematic': data['isProblematic'],
                    'element': $(element).attr('data-usage-id')
                });

                $.ajax({
                    type: "POST",
                    url: flagResourceUrl,
                    data: JSON.stringify(data),
                    success: function(result) {
                        var flaggedResourceDiv = $('.recommenderResource:eq(' + findResourceDiv(result['id']).toString() + ')', element);
                        var flagDiv = $('.flagResource:eq(' + findResourceDiv(result['id']).toString() + ')', element);
        
                        $(flaggedResourceDiv).find('.recommenderProblematicReason').text(result['reason']);
                        if (result['isProblematic']) { $(flagDiv).addClass('problematic'); }
                        else { $(flagDiv).removeClass('problematic'); }
                        addTooltipPerResource(flaggedResourceDiv);
                        backToView();
                    }
                });
            });
        
            /* Unflag the resource */
            $('.unflagButton', element).click(function() {
                data['isProblematic'] = false;
                Logger.log('flagResource.click.event', {
                    'status': 'Unflagging resource',
                    'id': data['id'],
                    'isProblematic': data['isProblematic'],
                    'element': $(element).attr('data-usage-id')
                });
            
                $.ajax({
                    type: "POST",
                    url: flagResourceUrl,
                    data: JSON.stringify(data),
                    success: function(result) {
                        var flaggedResourceDiv = $('.recommenderResource:eq(' + findResourceDiv(result['id']).toString() + ')', element);
                        var flagDiv = $('.flagResource:eq(' + findResourceDiv(result['id']).toString() + ')', element);
        
                        $(flaggedResourceDiv).find('.recommenderProblematicReason').text(result['reason']);
                        if (result['isProblematic']) { $(flagDiv).addClass('problematic'); }
                        else { $(flagDiv).removeClass('problematic'); }
                        addTooltipPerResource(flaggedResourceDiv);
                        backToView();
                    }
                });
            });
        });
    }

    /**
     * Bind event for each entry of resource 
     * 1. Upvote
     * 2. Downvote
     * 3. Hover
     * 4. Edit
     * 5. Flag
     * Arg:
     *         ele: recommenderResource element
     */
    function bindEvent(ele) {
        bindResourceVoteEvent('upvote', ele);
        bindResourceVoteEvent('downvote', ele);
        bindResourceHoverEvent(ele);
        bindResourceEditEvent(ele);
        bindResourceFlagEvent(ele);

        /* Generate log when students click a resource */
        $(ele).find('a').click(function() {
            Logger.log('resource.click.event', {
                'status': 'A resource was clicked',
                'id': $(ele).find('.recommenderEntryId').text(),
                'element': $(element).attr('data-usage-id')
            });
        });
    }

    /* Add tooltips to each global component */
    function addTooltip() {
        tooltipsCats.forEach(function(cats, ind) {
            var classes = cats.split(".");
            try {
                $("." + classes[1], element).tooltipster('destroy');
            }
            catch (e) {  }
        });
        tooltipsCats.forEach(function(cats, ind) {
            var classes = cats.split(".");
            try {
                if (classes.length == 3 && (! $("." + classes[1], element).hasClass(classes[2]) )) {
                    $("." + classes[1], element).tooltipster({
                        content: $('<span>' + tooltipsCatsText["." + classes[1]] + '</span>'),
                        theme: '.my-custom-theme',
                        maxWidth: '300'
                    });
                    return;
                }
                if ($(cats, element).hasClass('tooltipstered')) { return; }
                $(cats, element).tooltipster({
                    content: $('<span>' + tooltipsCatsText[cats] + '</span>'),
                    theme: '.my-custom-theme',
                    maxWidth: '300'
                }); 
            }
            catch (e) {  }
        });
     }

    /* Add tooltips to each cat in cats */
    function addTooltipPerCats(cats) {
        cats.forEach(function(cat, ind) {
            try {
                $(cat, element).tooltipster('destroy');
            }
            catch (e) {  }
        });
        cats.forEach(function(cat, ind) {
            try {
                $(cat, element).tooltipster({
                    content: $('<span>' + tooltipsCatsText[cat] + '</span>'),
                    theme: '.my-custom-theme',
                    maxWidth: '300'
                }); 
            }
            catch (e) {  }
        });
     }

    /* Add tooltips to each component in each resource */
    function addTooltipPerResource(ele) {
        tooltipsCatsPerResource.forEach(function(cats, ind) {
            var classes = cats.split(".");
            if (classes.length == 3) {
                try {
                    $(ele, element).find("." + classes[1]).tooltipster('destroy');
                }
                catch (e) {  }
            }
        });
        tooltipsCatsPerResource.forEach(function(cats, ind) {            
            var classes = cats.split(".");
            try {
                if (classes.length == 3 && (! $(ele, element).find("." + classes[1]).hasClass(classes[2]) )) {
                    $(ele, element).find("." + classes[1]).tooltipster({
                        content: $('<span>' + tooltipsCatsText["." + classes[1]] + '</span>'),
                        theme: '.my-custom-theme',
                        maxWidth: '300'
                    });
                    return;
                }
                //if ($(ele, element).find(cats).hasClass('tooltipstered')) { return; }
                $(ele, element).find(cats).tooltipster({
                    content: $('<span>' + tooltipsCatsText[cats] + '</span>'),
                    theme: '.my-custom-theme',
                    maxWidth: '300'
                }); 
            }
            catch (e) {  }
        });
     }

    /* Find the position (index of div) of a resource based on the resource Id */
    function findResourceDiv(resourceId) {
        index = -1;
        $('.recommenderEntryId', element).each(function(idx, ele){
            if (parseInt($(ele).text()) == resourceId) {
                index = idx;
                return false;
            }
        });
        return index;
    }
    
    /**
     * Check whether user is staff and add functions which are restricted to course staff
     */
    function initializeStaffVersion() {
        if (IS_USER_STAFF) {
            if (!DISABLE_DEV_UX) { toggleDeendorseMode(); }
            $('.recommenderResource', element).each(function(index, ele) {
                addFunctionsForStaffPerResource(ele);
                addTooltipPerResource(ele);
            });
        }
    }
    
    /**
     * This is a function restricted to course staff, where we can toggle between viewing mode for de-endorsement and
     * ordinary browsing
     * De-endorsement:
     *      Re-rank resources by first showing flagged resource, then non-flagged one in the order of inscreasing votes
     *      Show the reason and accumulated flagged result
     * Ordinary:
     *      Rank resources in the order of descreasing votes
     */
    function toggleDeendorseMode() {
        $('.resourceRankingForDeendorsementButton', element).removeClass('hidden');
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

                            sortResource('increasing', startEntryIndex);
                            paginationItem();
                            pagination();
                        }
                        else { alert(result['error']); }
                    }
                });
            }
            else {
                sortResource('decreasing', 0);
                paginationItem();
                pagination();
                if (!DISABLE_DEV_UX) { $('.showProblematicReasons', element).addClass('hidden'); }
                FLAGGED_RESOURCE_REASONS = {};
            }
        });
    }
    
    /**
     * Sort resources by their votes
     * mode = descreasing or increasing
     */
    function sortResource(mode, startEntryIndex) {
        if (startEntryIndex < 0) { return; }
        for (index = startEntryIndex; index < $('.recommenderResource', element).length - 1; index++) {
            var optimalIdx = index;
            var optimalValue = parseInt($('.recommenderResource:eq(' + optimalIdx + ')', element).find('.recommenderVoteScore').text())
            for (index2 = index + 1; index2 < $('.recommenderResource', element).length; index2++) {
                var currentValue = parseInt($('.recommenderResource:eq(' + index2 + ')', element).find('.recommenderVoteScore').text())
                if (mode == 'increasing') {
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
     * This is a function restricted to course staff, where we can deendorse a resource.
     * This function should be called once for each resource.
     * TODO: collect the reason for endorsement
     */
    function addFunctionsForStaffPerResource(ele) {
        /* Add event for endorsement */
        $(ele).find('.endorse').show();
        $(ele).find('.endorse').click(function() {
            var data = {};
            data['id'] = parseInt($(this).parent().parent().find('.recommenderEntryId').text());
            
            if ($(this).hasClass('endorsed')) {
                /* Undo the endorsement of a selected resource */
                endorse(data)
            }
            else {
                $('.endorsePage', element).show();
                $('.recommenderContent', element).hide();
                $('.recommenderModify', element).show();
                $('.recommenderModifyTitle', element).text('Endorse Resource');
                $('.endorsePage', element).find('input[type="text"]').val('');
                $('.endorseResource', element).unbind();
                /* Endorse a selected resource */
                $('.endorseResource', element).click(function() {
                    data['reason'] = $('.endorseReason', element).val();
                    /* Endorse a selected resource */
                    endorse(data);
                });
            }
        });
        
        /* Handle the student view and ajax calling for endorsement, given the provided data */
        function endorse(data) {
            var logStudentInput = data;
            if ('reason' in logStudentInput) { logStudentInput['status'] = 'Endorse resource'; }
            else { logStudentInput['status'] = 'Un-endorse resource'; }
            logStudentInput['element'] = $(element).attr('data-usage-id');
            Logger.log('endorseResource.click.event', logStudentInput);
            $.ajax({
                type: "POST",
                url: endorseResourceUrl,
                data: JSON.stringify(data),
                success: function(result) {
                    if (result['Success']) {
                        var endorsedResourceIdx = findResourceDiv(result['id']);
                        var endorsedDiv = $('.recommenderResource:eq(' + endorsedResourceIdx.toString() + ')', element);
                        endorsedDiv.find('.endorse').toggleClass('endorsed').show();
                        addTooltipPerResource(endorsedDiv);
                        if ('reason' in result) {
                            $(endorsedDiv).find('.recommenderEndorseReason').text(result['reason']);
                            backToView();
                        }
                        else { $(endorsedDiv).find('.recommenderEndorseReason').text(''); }
                    }
                    else { alert(result['error']); }
                }
            });
        }
        
        /* Add the button for entering deendorse mode */
        if ($(ele).find('.deendorse').length == 0) {
            $(ele).find('.recommenderEdit').append('<span class="ui-icon ui-icon-gear deendorse"></span>');
        }
                    
        /* Enter deendorse mode */
        $(ele).find('.deendorse').click(function() {
            $('.deendorsePage', element).show();
            $('.recommenderContent', element).hide();
            $('.recommenderModify', element).show();
            $('.recommenderModifyTitle', element).text('Deendorse Resource');
            $('.deendorsePage', element).find('input[type="text"]').val('');
            var data = {};
            data['id'] = parseInt($(this).parent().parent().find('.recommenderEntryId').text());
            
            $('.deendorseResource', element).unbind();
            /* Deendorse a selected resource */
            $('.deendorseResource', element).click(function() {
                data['reason'] = $('.deendorseReason', element).val();
                Logger.log('deendorseResource.click.event', {
                    'status': 'Deendorse resource',
                    'id': data['id'],
                    'reason': data['reason'],
                    'element': $(element).attr('data-usage-id')
                });
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
     * Initialize the interface by first setting the environment parameters and then rendering the web page.
     */
    function initial() {
        /* Set environment parameters */
        FLAGGED_RESOURCE_REASONS = {};
        $.ajax({
            type: "POST",
            url: getClientSideSettingsUrl,
            data: JSON.stringify({}),
            success: function(result) {
                DISABLE_DEV_UX = result['DISABLE_DEV_UX'];
                CURRENT_PAGE = result['CURRENT_PAGE'];
                ENTRIES_PER_PAGE = result['ENTRIES_PER_PAGE'];
                PAGE_SPAN = result['PAGE_SPAN'];
                IS_USER_STAFF = result['IS_USER_STAFF'];
                /* Render the initial web page */
                initialPageRendering();
            }
        });
    }

    /* Render the initial web page */
    function initialPageRendering() {
        backToView();
        $(".hideShow", element).click();
        initializeStaffVersion();
        
        paginationItem();
        pagination();
        addResourceReset();
        $('.recommenderResource', element).each(function(index, ele) { bindEvent(ele); addTooltipPerResource(ele); });
        addTooltip();
    
        if ($('.recommenderResource', element).length == 0) {
            $('.noResourceIntro', element).removeClass('hidden');
            $('.descriptionText', element).hide();
        }
    }
    initial();
}
