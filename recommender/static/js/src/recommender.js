if (typeof Logger == 'undefined') {
	var Logger = {
		log: function(a) { return; }
	}
}

function RecommenderXBlock(runtime, element) {
	/* Url for server side action */
	var handleUpvoteUrl = runtime.handlerUrl(element, 'handle_upvote');
	var handleDownvoteUrl = runtime.handlerUrl(element, 'handle_downvote');
	var addResourceUrl = runtime.handlerUrl(element, 'add_resource');
	var editResourceUrl = runtime.handlerUrl(element, 'edit_resource');
	var flagResourceUrl = runtime.handlerUrl(element, 'flag_resource');
	var uploadScreenshotUrl = runtime.handlerUrl(element, 'upload_screenshot');
	var isUserStaffUrl = runtime.handlerUrl(element, 'is_user_staff');
	var deendorseResourceUrl = runtime.handlerUrl(element, 'deendorse_resource');
	var setS3InfoUrl = runtime.handlerUrl(element, 'set_s3_info');
    var endorseResourceUrl = runtime.handlerUrl(element, 'endorse_resource');
    var getAccumFlaggedResourceUrl = runtime.handlerUrl(element, 'get_accum_flagged_resource');

    /* Parameters for resource display */
	var currentPage = 1;
	var entriesPerPage = 5;
	var pageSpan = 2;
	var is_user_staff = false;
    var flagged_resource_reasons = {};

	/* Show or hide resource list */
	$(".hide-show", element).click(function () {
		if ($(this).hasClass('resource_list_expanded')) {
			/* Initiate at least once for every session */
			Logger.log('hide-show.click.event', {
				'status': 'hide'
			});
			$(".recommender_row_inner", element).slideUp('fast');
			$(this).css('cursor', 's-resize');
		}
		else {
			Logger.log('hide-show.click.event', {
				'status': 'show'
			});
			$(".recommender_row_inner", element).slideDown('fast');
			$(this).css('cursor', 'n-resize');
		}
		$(this).find('.hide-show-icon').toggleClass('upArrowIcon').toggleClass('downArrowIcon');
		$(this).toggleClass('resource_list_expanded');
		addTooltip();
	});

	/* Show resources and page icons for different pages */
	function pagination() {
		/* Show resources for each page */
		$('.recommender_resource', element).each(function(index, ele) {
			if (index < (currentPage-1)*entriesPerPage || index >= currentPage*entriesPerPage) { $(ele, element).hide(); }
			else { $(ele, element).show(); }
		});

		/* Show page icons for each page */
		$('.paginationRow', element).each(function(index, ele) {
			if (index + 1 == currentPage) { $(ele, element).show(); }
			else { $(ele, element).hide(); }
		});
	}
	
	/** 
	 * Create pagination
	 * Create icons and bind page-changing event for each page of the resource list
	 * Each event will call pagination() for displaying proper content
	 */
	function paginationRow() {
		var totalPage = Math.ceil($('.recommender_resource', element).length/entriesPerPage);
		$('.paginationRow', element).remove();
		$('.paginationCell', element).unbind();
		if (totalPage == 1) { return; }

		/* Each paginationRow correspond to each page of resource list */
		for (var pageIdx = 1; pageIdx <= totalPage; pageIdx++) {
			var paginationRowDiv = $('.paginationRowTemplate', element).clone().removeClass('hidden').removeClass('paginationRowTemplate').addClass('paginationRow');
			/* No previous page if current page = 1 */
			if (pageIdx == 1) { paginationRowDiv.find('.leftArrowIcon').css("visibility", "hidden"); }
			if (pageIdx - pageSpan <= 1) { paginationRowDiv.find('.leftMoreIcon').css("visibility", "hidden"); }
		
			for (var i = pageIdx - pageSpan; i <= pageIdx + pageSpan; i++) {
				var currentCellDiv = paginationRowDiv.find('.lightgreyBg');
				if (i == pageIdx) { currentCellDiv.text(i.toString()); }
				else {
					var cellDiv = currentCellDiv.clone().removeClass('lightgreyBg').text(i.toString());
					if (i <= 0 || i > totalPage) { cellDiv.css("visibility", "hidden"); }
					if (i > pageIdx) { paginationRowDiv.find('.rightMoreIcon').before(cellDiv); }
					else { currentCellDiv.before(cellDiv); }
				}
			}
			if (pageIdx + pageSpan >= totalPage) { paginationRowDiv.find('.rightMoreIcon').css("visibility", "hidden"); }
			/* No next page if current page is last page */
			if (pageIdx == totalPage) { paginationRowDiv.find('.rightArrowIcon').css("visibility", "hidden"); }

			$('.pagination', element).append(paginationRowDiv);
		}

		/* Page-changing event */
		$('.paginationCell', element).click(function () {
			var logStr = 'From page ' + currentPage.toString();
			if ($(this).hasClass('moreIcon')) {
				Logger.log('pagination.click.event', {
					'status': 'moreIcon'
				});
				return;
			}
			else if ($(this).hasClass('leftArrowIcon')) {
				currentPage -= 1;
			}
			else if ($(this).hasClass('rightArrowIcon')) { currentPage += 1; }
			else { currentPage = parseInt($(this).text()); }
			logStr += ' To page ' + currentPage.toString();
			Logger.log('pagination.click.event', {
				'status': logStr
			});
			pagination();
		});
	}
	
    /**
     * Switch from resource addition/edit/flag/staff-edit modes to resource list displaying mode.
     */
	function backToView() {
		$('.recommender_modify', element).hide();
		$('.flagSourceBlock', element).hide();
		$('.editSourceBlock', element).hide();
		$('.recommender_add', element).hide();
		$('.deendorseBlock', element).hide();
        $('.endorseBlock', element).hide();
        $('.s3InfoBlock', element).hide();
		
		if ($('.recommender_resource', element).length == 0) {
			$('.noResourceIntro', element).removeClass('hidden');
		}
		$('.recommender_resource', element).removeClass('resource_hovered');
		$('.previewingImg', element).addClass('hidden');
		$('.descriptionText', element).hide();
        $('.problematic_reasons', element).addClass('hidden');
		
		$('.recommender_content', element).show();
	}

    /* Trigger event of mode switching from resource addition/edit/flag/staff-edit to resource list displaying. */
	$('.backToViewButton', element).click(function() {
		Logger.log('backToView.click.event', {
			'status': 'Back to resource list mode'
		});
		backToView();
	});
	
	/* Enter resource addition mode */
	$('.resource_add_button', element).click(function() {
		Logger.log('addResource.click.event', {
			'status': 'Entering add resource mode'
		});
	
		addResourceReset();
		$('.recommender_add', element).show();
		$('.recommender_content', element).hide();
		$('.recommender_modify', element).show();
		$('.recommender_modify_title', element).text('Suggest resource');
	});

	/* Initialize resource addition mode */
	function addResourceReset() {
		$('.recommender_add', element).find('input[type="text"]').val('');
		$('.recommender_add', element).find('textarea').val('')
		$('.addResourceForm', element).find("input[name='file']").val('');
		$('.add_submit', element).attr('disabled', true);
	}

	/* Check whether enough information (title/url) is provided for recommending a resource, if yes, enable summission button */
	function enableAddSubmit(divPtr) {
		if ($('.in_title', element).val() == '' || $('.in_url', element).val() == '') {
			$('.add_submit', element).attr('disabled', true);
			return;
		}
		$('.add_submit', element).attr('disabled', false);
	}

	/* If the input (text) area is changed, check whether user provides enough information to submit the resource */
	$('.in_title,.in_url,.in_descriptionText', element).bind('input propertychange', function() { enableAddSubmit(); });
	$('.addResourceForm', element).find("input[name='file']").change(function() {
		if ($(this).val() != '') { enableAddSubmit(); }
	});

	/* Upload the screenshot, submit the new resource, save the resource in the database, and update the current view of resource */
	$('.add_submit', element).click(function() {
		/* data: resource to be submitted to database */
		var data = {};
		data['url'] = $('.in_url', element).val();
		data['title'] = $('.in_title', element).val();
		data['descriptionText'] = $('.in_descriptionText', element).val();
		data['description'] = '';
		var formDiv = $('.addResourceForm', element);
		var file = new FormData($(formDiv)[0]);
		Logger.log('addResource.click.event', {
			'status': 'Add new resource',
			'title': data['title'],
			'url': data['url'],
			'description': $(formDiv).find("input[name='file']").val(),
			'descriptionText': data['descriptionText']
		});
		
		/* Case when there is no screenshot provided */
		if ($(formDiv).find("input[name='file']").val() == '') { addResource(data); }
		else {
			/* Upload the screenshot */
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
							enableAddSubmit();
							return;
						}
					}
					/* Submit the edited resource */
					data['description'] = result.responseText;
					addResource(data);
				},
			});
		}
	});

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
					$('.recommender_vote_score', element).each(function(idx, ele){ 
						if (parseInt($(ele).text()) < 0) {
							pos = idx;
							return false;
						}
					});

					/* Show the added resource at right place (pos), based on sorting the votes, and lead student to that page */
					if ($('.recommender_resource', element).length == 0) {
						$('.noResourceIntro', element).addClass('hidden');
						$('.descriptionText', element).show();
						currentPage = 1;
						var newDiv = $('.recommender_resourceTemplate', element).clone().removeClass('hidden').removeClass('recommender_resourceTemplate').addClass('recommender_resource');
					}
					else {
						if (pos == -1) {
							var toDiv = $('.recommender_resource:last', element);
							currentPage = Math.ceil(($('.recommender_resource', element).length+1)/entriesPerPage);
						}
						else {
							var toDiv = $('.recommender_resource:eq(' + pos.toString() + ')', element);
							currentPage = Math.ceil((pos + 1)/entriesPerPage); 
						}
						var newDiv = $(toDiv).clone();
					}
					/* Generate the div for the new resource */
					$(newDiv).find('.recommender_vote_arrow_up,.recommender_vote_score,.recommender_vote_arrow_down')
						.removeClass('downvoting').removeClass('upvoting');
					$(newDiv).find('.recommender_vote_score').text('0');
					$(newDiv).find('a').attr('href', result['url']);
					$(newDiv).find('a').text(result['title']);
					$(newDiv).find('.recommender_descriptionImg').text(result['description']);
					$(newDiv).find('.recommender_descriptionText').text(result['descriptionText']);
					$(newDiv).find('.recommender_entryId').text(result['id']);
					$(newDiv).find('.recommender_problematicReason').text('');
					$(newDiv).find('.flagResource').removeClass('problematic');
                    $(newDiv).find('.endorse').removeClass('endorsed');
					bindEvent(newDiv);
					if (is_user_staff) { addFunctionsForStaffPerResource(newDiv); }

					if ($('.recommender_resource', element).length == 0) {
						$('.recommender_resourceTemplate', element).before(newDiv);
					}
					else {
						if (pos == -1) { $(toDiv).after(newDiv); }
						else { $(toDiv).before(newDiv); }
					}
					addTooltipPerResource(newDiv);
					addResourceReset();
					paginationRow();
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
     * Unbind event for each entry of resource 
	 * 1. Upvoting
	 * 2. Downvoting
	 * 3. Hovering
	 * 4. Editing
	 * 5. Flagging
	 */
	function unbindEvent(ele) {
		$(ele).find('.recommender_vote_arrow_up').unbind();
		$(ele).find('.recommender_vote_arrow_down').unbind();
		$(ele).unbind();
		$(ele).find('.resource_edit_button').unbind();
		$(ele).find('.flagResource').unbind();
	}

	/**
	 * Bind event for each entry of resource 
	 * 1. Upvoting
	 * 2. Downvoting
	 * 3. Hovering
	 * 4. Editing
	 * 5. Flagging
	 * Arg:
	 * 		ele: recommender_resource element
	 */
	function bindEvent(ele) {
		/* Upvoting event */
		$(ele).find('.recommender_vote_arrow_up').click(function() {
			var data = {};
			data['id'] = parseInt($(this).parent().parent().find('.recommender_entryId').text());
			if (data['id'] == -1) { return; }
			Logger.log('arrowUp.click.event', {
				'status': 'Arrow up',
				'id': data['id']
			});
			
			$.ajax({
				type: "POST",
				url: handleUpvoteUrl,
				data: JSON.stringify(data),
				success: function(result) {
					if (result['Success'] == true) {
						var divArrowUp = $('.recommender_resource:eq(' + findResourceDiv(result['id']).toString() + ')', element);
						$(divArrowUp)
							.find('.recommender_vote_arrow_up, .recommender_vote_arrow_down, .recommender_vote_score')
							.toggleClass('upvoting');
						if ('toggle' in result) { 
							$(divArrowUp)
								.find('.recommender_vote_arrow_up, .recommender_vote_arrow_down, .recommender_vote_score')
								.toggleClass('downvoting');
						}
						$(divArrowUp).find('.recommender_vote_score').html(result['newVotes'].toString());
					}
                    else {
                        alert(result['error']);
                    }
				}
			});
		});

		/* Downvoting event */
		$(ele).find('.recommender_vote_arrow_down').click(function() {
			var data = {};
			data['id'] = parseInt($(this).parent().parent().find('.recommender_entryId').text());
			if (data['id'] == -1) { return; }
			Logger.log('arrowDown.click.event', {
				'status': 'Arrow down',
				'id': data['id']
			});

			$.ajax({
				type: "POST",
				url: handleDownvoteUrl,
				data: JSON.stringify(data),
				success: function(result) {
					if (result['Success'] == true) {
						var divArrowDown = $('.recommender_resource:eq(' + findResourceDiv(result['id']).toString() + ')', element);
						$(divArrowDown)
							.find('.recommender_vote_arrow_up, .recommender_vote_arrow_down, .recommender_vote_score')
							.toggleClass('downvoting');
						if ('toggle' in result) { 
							$(divArrowDown)
								.find('.recommender_vote_arrow_up, .recommender_vote_arrow_down, .recommender_vote_score')
								.toggleClass('upvoting');
						}
						$(divArrowDown).find('.recommender_vote_score').html(result['newVotes'].toString());
					}
                    else {
                        alert(result['error']);
                    }
				}
			});
		});

		/* Show preview and description for a resource when hovering over it */
		$(ele).hover(
			function() {
				$('.recommender_resource', element).removeClass('resource_hovered');
                $(this).addClass('resource_hovered');

                $('.descriptionText', element).hide();
				$('.descriptionText', element).text($(this).find('.recommender_descriptionText').text());				
				if ($('.descriptionText', element).text() != '') { $('.descriptionText', element).show(); }

                $('.previewingImg', element).removeClass('hidden');
                $('.previewingImg', element).attr('src', $(this).find('.recommender_descriptionImg').text());
                $(".previewingImg", element).error(function() { $('.previewingImg', element).addClass('hidden'); });
                if ($('.previewingImg', element).attr('src') == '') { $('.previewingImg', element).addClass('hidden'); }
                
                $('.problematic_reasons', element).addClass('hidden');
                if (!$.isEmptyObject(flagged_resource_reasons)) {
                    var resource_id = parseInt($(this).find('.recommender_entryId').text());
                    var reasons = '';
                    if (resource_id in flagged_resource_reasons) {
                        $('.problematic_reasons', element).removeClass('hidden');
                        reasons = flagged_resource_reasons[resource_id].join(reason_separator);
                    }
                    if (reasons != '') { $('.problematic_reasons', element).html(problematic_ressons_prefix + reasons); }
                    else { $('.problematic_reasons', element).html(''); }
                }

				Logger.log('resource.hover.event', {
					'status': 'Hovering resource',
					'id': $(this).find('.recommender_entryId').text()
				});
			}, function() {
			}
		);

        /* Emit log for student clicking a resource */
        $(ele).find('a').click(function() {
            Logger.log('resource.click.event', {
				'status': 'A resource was clicked',
				'id': $(ele).find('.recommender_entryId').text()
			});
        });
        
		/* Edit existing resource */
		$(ele).find('.resource_edit_button').click(function() {
			$('.editSourceBlock', element).show();
			$('.recommender_content', element).hide();
			$('.recommender_modify', element).show();
			$('.recommender_modify_title', element).text('Edit existing resource');
			var resourceDiv = $(this).parent().parent();
	
			/* data: resource to be submitted to database */
			var data = {};
			data['id'] = parseInt(resourceDiv.find('.recommender_entryId').text());
	
			/* Initialize resource edit mode */
			$('.edit_title', element).val(resourceDiv.find('.recommender_title').find('a').text());
			$('.edit_url', element).val(resourceDiv.find('.recommender_title').find('a').attr('href'));
			$('.edit_descriptionText', element).val(resourceDiv.find('.recommender_descriptionText').text());
			$('.editResourceForm', element).find("input[name='file']").val('');
			$('.edit_submit', element).attr('disabled', true);
	
			Logger.log('editResource.click.event', {
				'status': 'Entering edit resource mode',
				'id': data['id']
			});

			/* Check whether enough information (title/url) is provided for editing a resource, if yes, enable summission button */
			function enableEditSubmit() {
				if ($('.edit_title', element).val() == '' || $('.edit_url', element).val() == '') {
					$('.edit_submit', element).attr('disabled', true);
					return;
				}
				$('.edit_submit', element).attr('disabled', false);
			}
			
            /* If the input (text) area is changed, or a new file is uploaded, check whether user provides enough information to submit the resource */
			$('.edit_title,.edit_url,.edit_descriptionText', element).unbind();
			$('.edit_title,.edit_url,.edit_descriptionText', element).bind('input propertychange', function() { enableEditSubmit(); });
			$('.editResourceForm', element).find("input[name='file']").unbind();
			$('.editResourceForm', element).find("input[name='file']").change(function() {
				if ($(this).val() != '') { enableEditSubmit(); }
			});
			
			/* Add tooltips for editting page */
			addTooltipPerCats(tooltipsEditCats);

			/* Upload the screen shot, submit the edited resource, save the resource in the database, and update the current view of resource */
			$('.edit_submit', element).unbind();
			$('.edit_submit', element).click(function() {
				/* data: resource to be submitted to database */
				data['url'] = $('.edit_url', element).val();
				data['title'] = $('.edit_title', element).val();
				data['descriptionText'] = $('.edit_descriptionText', element).val();
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
					'id': data['id']
				});

                /* Case when there is no screenshot provided */
				if ($(formDiv).find("input[name='file']").val() == '') { editResource(data); }
				else {
					/* Upload the screenshot */
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
									enableEditSubmit();
									return;
								}
							}
							/* Submit the edited resource */
							data['description'] = result.responseText;
							editResource(data);
						},
					});
				}
	
				/**
			     * Submit the edited resource, save the resource in the database, and update the current view of resource
			     * data: resource to be submitted to database 
			     */
				function editResource (data) {
					$.ajax({
						type: "POST",
						url: editResourceUrl,
						data: JSON.stringify(data),
						success: function(result) {
							if (result['Success'] == true) {
								var resourceDiv = $('.recommender_resource:eq(' + findResourceDiv(result['id']).toString() + ')', element);
	
								/* Update the edited resource */
								resourceDiv.find('.recommender_title').find('a').text(result['title']);
								resourceDiv.find('.recommender_title').find('a').attr('href', result['url']);
								if (data["description"] != "") { resourceDiv.find('.recommender_descriptionImg').text(result['description']); }
								if (data["descriptionText"] != "") { resourceDiv.find('.recommender_descriptionText').text(result['descriptionText']); }
								backToView();
							}
                            else { alert(result['error']); }
						}
					});
				}
			});
		});

		/* Flag problematic resource and give the reason why users think it is problematic */
		$(ele).find('.flagResource').click(function() {
			$('.flagSourceBlock', element).show();
			$('.recommender_content', element).hide();
			$('.recommender_modify', element).show();
			$('.recommender_modify_title', element).text('Flag Resource');

			var flagDiv = $(this);
			var flaggedResourceDiv = $(this).parent().parent();
 			$('.flag_reason', element).val($(flaggedResourceDiv).find('.recommender_problematicReason').text());
			data = {};
			data['id'] = parseInt($(flaggedResourceDiv).find('.recommender_entryId').text());
          
			Logger.log('flagResource.click.event', {
				'status': 'Entering flag resource mode',
				'id': data['id']
			});

			$('.flag_reason_submit', element).unbind();
			$('.unflag_button', element).unbind();

			/* Flag the problematic resource and save the reason to database */ 
			$('.flag_reason_submit', element).click(function() {
				data['reason'] = $('.flag_reason', element).val();
				data['isProblematic'] = true;
				Logger.log('flagResource.click.event', {
					'status': 'Flagging resource',
					'id': data['id'],
					'reason': data['reason'],
					'isProblematic': data['isProblematic']
				});

				$.ajax({
					type: "POST",
					url: flagResourceUrl,
					data: JSON.stringify(data),
					success: function(result) {
						var flaggedResourceDiv = $('.recommender_resource:eq(' + findResourceDiv(result['id']).toString() + ')', element);
						var flagDiv = $('.flagResource:eq(' + findResourceDiv(result['id']).toString() + ')', element);
		
						$(flaggedResourceDiv).find('.recommender_problematicReason').text(result['reason']);
						if (result['isProblematic']) { $(flagDiv).addClass('problematic'); }
						else { $(flagDiv).removeClass('problematic'); }
						addTooltipPerResource(flaggedResourceDiv);
						backToView();
					}
				});
			});
		
			/* Unflag the resource */
			$('.unflag_button', element).click(function() {
				data['isProblematic'] = false;
				Logger.log('flagResource.click.event', {
					'status': 'Unflagging resource',
					'id': data['id'],
					'isProblematic': data['isProblematic']
				});
			
				$.ajax({
					type: "POST",
					url: flagResourceUrl,
					data: JSON.stringify(data),
					success: function(result) {
						var flaggedResourceDiv = $('.recommender_resource:eq(' + findResourceDiv(result['id']).toString() + ')', element);
						var flagDiv = $('.flagResource:eq(' + findResourceDiv(result['id']).toString() + ')', element);
		
						$(flaggedResourceDiv).find('.recommender_problematicReason').text(result['reason']);
						if (result['isProblematic']) { $(flagDiv).addClass('problematic'); }
						else { $(flagDiv).removeClass('problematic'); }
						addTooltipPerResource(flaggedResourceDiv);
						backToView();
					}
				});
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
		$('.recommender_entryId', element).each(function(idx, ele){
			if (parseInt($(ele).text()) == resourceId) {
				index = idx;
				return false;
			}
		});
		return index;
	}
	
	/* Check whether user is staff and add staff-specific functions */
	function initializeStaffVersion() {
		$.ajax({
			type: "POST",
			url: isUserStaffUrl,
			data: JSON.stringify({}),
			success: function(result) {
				if (result['is_user_staff']) {
					is_user_staff = true;
                    setS3info();
                    toggleDeendorseMode();
					$('.recommender_resource', element).each(function(index, ele) { addFunctionsForStaffPerResource(ele); addTooltipPerResource(ele); });
				}
			}
		});
	}
    
    /**
     * Toggle between viewing mode for de-endorsement and ordinary browsing
     * De-endorsement:
     *      Re-rank resources by first showing flagged resource, then non-flagged one in the order of inscreasing votes
     *      Show the reason and accumulated flagged result
     * Ordinary:
     *      Rank resources in the order of descreasing votes
     */
    function toggleDeendorseMode() {
        $('.resource_ranking_for_deendorsement_button', element).removeClass('hidden');
        $('.resource_ranking_for_deendorsement_button', element).click(function() {
            $(this).toggleClass('deendorsement_mode');
            addTooltip();
            if ($(this).hasClass('deendorsement_mode')) {
                $.ajax({
                    type: "POST",
                    url: getAccumFlaggedResourceUrl,
                    data: JSON.stringify({}),
                    success: function(result) {
                        if (result['Success']) {
                            flagged_resource_reasons = result['flagged_resources'];
                            var startEntryIndex = 0;
                            for (var key in flagged_resource_reasons) {
                                //alert(key)
                                var resource_pos = findResourceDiv(key);
                                if (startEntryIndex != resource_pos) {
                                    $('.recommender_resource:eq(' + startEntryIndex + ')', element).before($('.recommender_resource:eq(' + resource_pos + ')', element));
                                }
                                startEntryIndex++;
                            }

                            sortResource('increasing', startEntryIndex);
                            paginationRow();
                            pagination();
                        }
                        else { alert(result['error']); }
                    }
                });
            }
            else {
                sortResource('decreasing', 0);
                paginationRow();
                pagination();
                $('.problematic_reasons', element).addClass('hidden');
                flagged_resource_reasons = {};
            }
        });
    }
    
    /**
     * Sort resources by their votes
     * mode = descreasing or increasing
     */
    function sortResource(mode, startEntryIndex) {
        if (startEntryIndex < 0) { return; }
        for (index = startEntryIndex; index < $('.recommender_resource', element).length - 1; index++) {
            optimal_idx = index;
            optimal_value = parseInt($('.recommender_resource:eq(' + optimal_idx + ')', element).find('.recommender_vote_score').text())
            for (index2 = index + 1; index2 < $('.recommender_resource', element).length; index2++) {
                current_value = parseInt($('.recommender_resource:eq(' + index2 + ')', element).find('.recommender_vote_score').text())
                if (mode == 'increasing') {
                    if (current_value < optimal_value){
                        optimal_value = current_value;
                        optimal_idx = index2;
                    }
                }
                else {
                    if (current_value > optimal_value){
                        optimal_value = current_value;
                        optimal_idx = index2;
                    }
                }
            }
            if (index == optimal_idx) { continue; }
            /* Move div */
            $('.recommender_resource:eq(' + index + ')', element).before($('.recommender_resource:eq(' + optimal_idx + ')', element));
        }
    }

	/**
	 * Prepare the page for S3 configuration setup
	 * Called once per session
	 */
    function setS3info() {
        $('.s3info_add_button', element).removeClass('hidden');
		$('.s3info_add_button', element).click(function() {
			$('.s3InfoBlock', element).show();
			$('.recommender_content', element).hide();
			$('.recommender_modify', element).show();
			$('.recommender_modify_title', element).text('Set S3 information');
			$('.s3InfoBlock', element).find('input[type="text"]').val('');
		});
		
  		/* Add textarea and buttons in the staff-edit mode */
		s3_info_textareas.forEach(function(ele, ind) {
			$('.s3InfoBlock', element).append('<div>' + s3_info_textareas_text[ele] + '</div>')
				.append('<input type="text" class="' + ele + '" placeholder="' + s3_info_textareas_placeholder[ele] + '"/><br/>');
  		});
		s3_info_buttons.forEach(function(ele, ind) {
			$('.s3InfoBlock', element).append('<input type="button" value="' + s3_info_buttons_text[ele] + '" class="' + ele + '">');
  			if (ind == 0) {
  				$('.' + ele, element).attr('disabled', true);
  			}
  		});
  		
  		/* Check whether enough information is provided for S3, if yes, enable summission button */
  		function enableS3Submit(divPtr) {
  			var emptyFlag = false;
			s3_info_textareas.forEach(function(ele, ind) {
  				if ($('.' + ele, element).val() == '') {
  					$('.submit_s3_info', element).attr('disabled', true);
  					emptyFlag = true;
					return;
				}
			});
			if (!emptyFlag) { $('.submit_s3_info', element).attr('disabled', false); }
		}
		
		/* If the input (text) area is changed, check whether staff provides enough information for S3 */
		s3_info_textareas.forEach(function(ele, ind) {
			$('.' + ele, element).bind('input propertychange', function() { enableS3Submit(); });
		});
		
		/* Submit the information for S3; this action is independent of selected resource */
		$('.submit_s3_info', element).click(function() {
			var data = {};
            s3_info_textareas.forEach(function(ele, ind) {
				data[ele] = $('.' + ele, element).val();
			});
			$.ajax({
				type: "POST",
				url: setS3InfoUrl,
				data: JSON.stringify(data),
				success: function(result) {
					if (result['Success']) { backToView(); }
					else { alert(result['error']); }
				}
			});
		});
	}

    /**
     * Deendorsement a resource
     * Called once per resource
     * These manipulations are restricted to course staff
     * TODO: collect the reason for endorsement
     */
    function addFunctionsForStaffPerResource(ele) {
        /* Add event for endorsement */
        $(ele).find('.endorse').show();
        $(ele).find('.endorse').click(function() {
            var data = {};
			data['id'] = parseInt($(this).parent().parent().find('.recommender_entryId').text());
            
            if ($(ele).hasClass('endorsed')) {
                $('.endorseBlock', element).show();
                $('.recommender_content', element).hide();
                $('.recommender_modify', element).show();
                $('.recommender_modify_title', element).text('Endorse Resource');
                $('.endorseBlock', element).find('input[type="text"]').val('');
                $('.endorse_resource', element).unbind();
                /* Endorse a selected resource */
                $('.endorse_resource', element).click(function() {
                    data['reason'] = $('.endorse_reason', element).val();
                    /* Endorse a selected resource */
                    endorse(data);
                }
            }
            else {
                /* Undo the endorsement of a selected resource */
                endorse(data)
            }
        });
        
        /* Handle the student view and ajax calling for endorsement, given the provided data */
        function endorse(data) {
            event_log = data;
            if ('reason' in event_log) { event_log['status'] = 'Endorse resource'; }
            else { event_log['status'] = 'Un-endorse resource'; }
            Logger.log('endorseResource.click.event', event_log);
            $.ajax({
                type: "POST",
                url: endorseResourceUrl,
                data: JSON.stringify(data),
                success: function(result) {
                    if (result['Success']) {
                        var endorsedResourceIdx = findResourceDiv(result['id']);
                        var endorsedDiv = $('.recommender_resource:eq(' + endorsedResourceIdx.toString() + ')', element);
                        endorsedDiv.find('.endorse').toggleClass('endorsed').show();
                        addTooltipPerResource(endorsedDiv);
                        if ('reason' in result) {
                            $(endorsedDiv).find('.recommender_endorse_reason').text(result['reason']);
                            backToView();
                        }
                        else { $(endorsedDiv).find('.recommender_endorse_reason').text(''); }
                    }
                    else { alert(result['error']); }
                }
            });
        }
        
		/* Add the button for entering deendorse mode */
		if ($(ele).find('.deendorse').length == 0) {
			$(ele).find('.recommender_edit').append('<span class="ui-icon ui-icon-gear deendorse"></span>');
		}
					
		/* Enter deendorse mode */
		$(ele).find('.deendorse').click(function() {
			$('.deendorseBlock', element).show();
			$('.recommender_content', element).hide();
			$('.recommender_modify', element).show();
			$('.recommender_modify_title', element).text('Deendorse Resource');
			$('.deendorseBlock', element).find('input[type="text"]').val('');
			var data = {};
			data['id'] = parseInt($(this).parent().parent().find('.recommender_entryId').text());
            
			$('.deendorse_resource', element).unbind();
			/* Deendorse a selected resource */
			$('.deendorse_resource', element).click(function() {
                data['reason'] = $('.deendorse_reason', element).val();
                Logger.log('deendorseResource.click.event', {
                    'status': 'Deendorse resource',
                    'id': data['id'],
				    'reason': data['reason']
                });
				$.ajax({
					type: "POST",
					url: deendorseResourceUrl,
					data: JSON.stringify(data),
					success: function(result) {
						if (result['Success']) {
							var deletedResourceIdx = findResourceDiv(result['id']);
							$('.recommender_resource:eq(' + deletedResourceIdx.toString() + ')', element).remove();
							/* Deendorse (remove) last resource */
							if ($('.recommender_resource', element).length == deletedResourceIdx) { deletedResourceIdx--; }
							currentPage = Math.ceil((deletedResourceIdx + 1)/entriesPerPage); 
							paginationRow();
							pagination();
							backToView();
						}
						else { alert(result['error']); }
					}
				});
			});
		});		
	}

    /* Initialize the interface */
	function initial() {
		backToView();
		$(".hide-show", element).click();
		initializeStaffVersion();
		
		paginationRow();
		pagination();
		addResourceReset();
		$('.recommender_resource', element).each(function(index, ele) { bindEvent(ele); addTooltipPerResource(ele); });
		addTooltip();
	
		if ($('.recommender_resource', element).length == 0) {
			$('.noResourceIntro', element).removeClass('hidden');
			$('.descriptionText', element).hide();
		}
	}
	initial();
}
