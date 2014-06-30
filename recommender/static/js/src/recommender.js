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
	var deleteResourceUrl = runtime.handlerUrl(element, 'delete_resource');
	var setS3InfoUrl = runtime.handlerUrl(element, 'set_s3_info');

    /* Parameters for resource display */
	var currentPage = 1;
	var entriesPerPage = 5;
	var pageSpan = 2;

	/* Show or hide resource list */
	$(".hide-show").click(function () {
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
		$('.recommender_resource').each(function(index, element) {
			if (index < (currentPage-1)*entriesPerPage || index >= currentPage*entriesPerPage) { $(element).hide(); }
			else { $(element).show(); }
		});

		/* Show page icons for each page */
		$('.paginationRow').each(function(index, element) {
			if (index + 1 == currentPage) { $(element).show(); }
			else { $(element).hide(); }
		});
	}
	
	/** 
	 * Create pagination
	 * Create icons and bind page-changing event for each page of the resource list
	 * Each event will call pagination() for displaying proper content
	 */
	function paginationRow() {
		var totalPage = Math.ceil($('.recommender_resource').length/entriesPerPage);
		$('.paginationRow').remove();
		$('.paginationCell').unbind();
		if (totalPage == 1) { return; }

		/* Each paginationRow correspond to each page of resource list */
		for (var pageIdx = 1; pageIdx <= totalPage; pageIdx++) {
			var paginationRowDiv = $('.paginationRowTemplate').clone().removeClass('hidden').removeClass('paginationRowTemplate').addClass('paginationRow');
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

			$('.pagination').append(paginationRowDiv);
		}

		/* Page-changing event */
		$('.paginationCell').click(function () {
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
		$('.recommender_modify').hide();
		$('.flagSourceBlock').hide();
		$('.editSourceBlock').hide();
		$('.recommender_add').hide();
		$('.staffEditionBlock').hide();
		
		if ($('.recommender_resource').length == 0) {
			$('.noResourceIntro').removeClass('hidden');
		}
		$('.recommender_resource').removeClass('resource_hovered');
		$('.previewingImg').addClass('hidden');
		$('.descriptionText').hide();
		
		$('.recommender_content').show();
	}

    /* Trigger event of mode switching from resource addition/edit/flag/staff-edit to resource list displaying. */
	$('.backToViewButton').click(function() {
		Logger.log('backToView.click.event', {
			'status': 'Back to resource list mode'
		});
		backToView();
	});
	
	/* Enter resource addition mode */
	$('.resource_add_button').click(function() {
		Logger.log('addResource.click.event', {
			'status': 'Entering add resource mode'
		});
	
		addResourceReset();
		$('.recommender_add').show();
		$('.recommender_content').hide();
		$('.recommender_modify').show();
		$('.recommender_modify_title').text('Suggest resource');
	});

	/* Initialize resource addition mode */
	function addResourceReset() {
		$('.recommender_add').find('input[type="text"]').val('');
		$('.recommender_add').find('textarea').val('')
		$('#addResourceForm').find("input[name='file']").val('');
		$('.add_submit').attr('disabled', true);
	}

	/* Check whether enough information (title/url) is provided for recommending a resource, if yes, enable summission button */
	function enableAddSubmit(divPtr) {
		if ($('.in_title').val() == '' || $('.in_url').val() == '') {
			$('.add_submit').attr('disabled', true);
			return;
		}
		$('.add_submit').attr('disabled', false);
	}

	/* If the input (text) area is changed, check whether user provides enough information to submit the resource */
	$('.in_title').bind('input propertychange', function() { enableAddSubmit(); });
	$('.in_url').bind('input propertychange', function() { enableAddSubmit(); });

	/* Upload the screenshot, submit the new resource, save the resource in the database, and update the current view of resource */
	$('.add_submit').click(function() {
		/* data: resource to be submitted to database */
		var data = {};
		data['url'] = $('.in_url').val();
		data['title'] = $('.in_title').val();
		data['descriptionText'] = $('.in_descriptionText').val();
		data['description'] = '';
		var formDiv = $('#addResourceForm');
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
					/* Case when wrong file type is provided; accept files only in jpg, png, and gif */
					if (result.responseText == 'FILETYPEERROR') {
						alert('Please upload an image');
						$(formDiv).find("input[name='file']").val('');
					}
					else if (result.responseText == 'IMPROPER_S3_SETUP'){
						alert('The configuration of Amazon Web Services is not properly set');
						$(formDiv).find("input[name='file']").val('');
					}
					else {
						/* Submit the new resource */
						data['description'] = result.responseText;
						addResource(data);
					}
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
					$('.recommender_vote_score').each(function(idx, ele){ 
						if (parseInt($(ele).text()) < 0) {
							pos = idx;
							return false;
						}
					});

					/* Show the added resource at right place (pos), based on sorting the votes, and lead student to that page */
					if ($('.recommender_resource').length == 0) {
						$('.noResourceIntro').addClass('hidden');
						$('.descriptionText').show();
						currentPage = 1;
						var newDiv = $('.recommender_resourceTemplate').clone(true, true).removeClass('hidden').removeClass('recommender_resourceTemplate').addClass('recommender_resource');
					}
					else {
						if (pos == -1) {
							var toDiv = $('.recommender_resource:last');
							currentPage = Math.ceil(($('.recommender_resource').length+1)/entriesPerPage);
						}
						else {
							var toDiv = $('.recommender_resource:eq(' + pos.toString() + ')');
							currentPage = Math.ceil((pos + 1)/entriesPerPage); 
						}
						var newDiv = $(toDiv).clone(true, true);
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

					if ($('.recommender_resource').length == 0) {
						$('.recommender_resourceTemplate').before(newDiv);
						unbindEvent();
						bindEvent();
					}
					else {
						if (pos == -1) { $(toDiv).after(newDiv); }
						else { $(toDiv).before(newDiv); }
					}

					addResourceReset();
					paginationRow();
					pagination();
					backToView();
				}
				else { alert('add redundant resource'); }
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
	function unbindEvent() {
		$('.recommender_vote_arrow_up').unbind();
		$('.recommender_vote_arrow_down').unbind();
		$('.recommender_resource').unbind();
		$('.resource_edit_button').unbind();
		$('.flagResource').unbind();
	}

	/**
	 * Bind event for each entry of resource 
	 * 1. Upvoting
	 * 2. Downvoting
	 * 3. Hovering
	 * 4. Editing
	 * 5. Flagging
	 */
	function bindEvent() {
		/* Upvoting event */
		$('.recommender_vote_arrow_up').click(function() {
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
						var divArrowUp = $('.recommender_resource:eq(' + findResourceDiv(result['id']).toString() + ')');
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
				}
			});
		});

		/* Downvoting event */
		$('.recommender_vote_arrow_down').click(function() {
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
						var divArrowDown = $('.recommender_resource:eq(' + findResourceDiv(result['id']).toString() + ')');
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
				}
			});
		});

		/* Show preview and description for a resource when hovering over it */
		$('.recommender_resource').hover(
			function() {
				$('.recommender_resource').removeClass('resource_hovered');
				$('.descriptionText').hide();
                $('.previewingImg').addClass('hidden');
				$(this).addClass('resource_hovered');
				$('.previewingImg').attr('src', $(this).find('.recommender_descriptionImg').text());
				$('.descriptionText').text($(this).find('.recommender_descriptionText').text());
				
				if ($('.descriptionText').text() != '') { $('.descriptionText').show(); }
                $(".previewingImg").load(function() { $('.previewingImg').removeClass('hidden'); });

				Logger.log('resource.hover.event', {
					'status': 'Hovering resource',
					'id': $(this).find('.recommender_entryId').text()
				});
			}, function() {
			}
		);

		/* Edit existing resource */
		$('.resource_edit_button').click(function() {
			$('.editSourceBlock').show();
			$('.recommender_content').hide();
			$('.recommender_modify').show();
			$('.recommender_modify_title').text('Edit existing resource');
			var resourceDiv = $(this).parent().parent();
	
			/* data: resource to be submitted to database */
			var data = {};
			data['id'] = parseInt(resourceDiv.find('.recommender_entryId').text());
	
			/* Initialize resource edit mode */
			$('.edit_title').val(resourceDiv.find('.recommender_title').find('a').text());
			$('.edit_url').val(resourceDiv.find('.recommender_title').find('a').attr('href'));
			$('.edit_descriptionText').val(resourceDiv.find('.recommender_descriptionText').text());
			$('#editResourceForm').find("input[name='file']").val('');
			$('.edit_submit').attr('disabled', true);
	
			Logger.log('editResource.click.event', {
				'status': 'Entering edit resource mode',
				'id': data['id']
			});

			/* Check whether enough information (title/url) is provided for editing a resource, if yes, enable summission button */
			function enableEditSubmit() {
				if ($('.edit_title').val() == '' || $('.edit_url').val() == '') {
					$('.edit_submit').attr('disabled', true);
					return;
				}
				$('.edit_submit').attr('disabled', false);
			}
			
            /* If the input (text) area is changed, or a new file is uploaded, check whether user provides enough information to submit the resource */
			$('.edit_title,.edit_url,.edit_descriptionText').unbind();
			$('.edit_title,.edit_url,.edit_descriptionText').bind('input propertychange', function() { enableEditSubmit(); });
			$('#editResourceForm').find("input[name='file']").unbind();
			$('#editResourceForm').find("input[name='file']").change(function() {
				if ($(this).val() != '') { enableEditSubmit(); }
			});

			/* Upload the screen shot, submit the edited resource, save the resource in the database, and update the current view of resource */
			$('.edit_submit').unbind();
			$('.edit_submit').click(function() {
				/* data: resource to be submitted to database */
				data['url'] = $('.edit_url').val();
				data['title'] = $('.edit_title').val();
				data['descriptionText'] = $('.edit_descriptionText').val();
				data['description'] = ''
				if (data['url'] == '' || data['title'] == '') { return; }
				var formDiv = $('#editResourceForm');
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
							/* Case when wrong file type is provided; accept files only in jpg, png, and gif */
							if (result.responseText == 'FILETYPEERROR') {
								alert('Please upload an image');
								$(formDiv).find("input[name='file']").val('');
							}
							else if (result.responseText == 'IMPROPER_S3_SETUP'){
								alert('The configuration of Amazon Web Services is not properly set');
								$(formDiv).find("input[name='file']").val('');
							}
							else {
								/* Submit the edited resource */
								data['description'] = result.responseText;
								editResource(data);
							}
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
								var resourceDiv = $('.recommender_resource:eq(' + findResourceDiv(result['id']).toString() + ')');
	
								/* Update the edited resource */
								resourceDiv.find('.recommender_title').find('a').text(result['title']);
								resourceDiv.find('.recommender_title').find('a').attr('href', result['url']);
								if (data["description"] != "") { resourceDiv.find('.recommender_descriptionImg').text(result['description']); }
								if (data["descriptionText"] != "") { resourceDiv.find('.recommender_descriptionText').text(result['descriptionText']); }
								backToView();
							}
							else { alert('The url you entered has been already provided by your fellows'); }
						}
					});
				}
			});
		});

		/* Flag problematic resource and give the reason why users think it is problematic */
		$('.flagResource').click(function() {
			$('.flagSourceBlock').show();
			$('.recommender_content').hide();
			$('.recommender_modify').show();
			$('.recommender_modify_title').text('Flag Resource');

			var flagDiv = $(this);
			var flaggedResourceDiv = $(this).parent().parent();
 			$('.flag_reason').val($(flaggedResourceDiv).find('.recommender_problematicReason').text());
			data = {};
			data['id'] = parseInt($(flaggedResourceDiv).find('.recommender_entryId').text());
          
			Logger.log('flagResource.click.event', {
				'status': 'Entering flag resource mode',
				'id': data['id']
			});

			$('.flag_reason_submit').unbind();
			$('.unflag_button').unbind();

			/* Flag the problematic resource and save the reason to database */ 
			$('.flag_reason_submit').click(function() {
				data['reason'] = $('.flag_reason').val();
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
						var flaggedResourceDiv = $('.recommender_resource:eq(' + findResourceDiv(result['id']).toString() + ')');
						var flagDiv = $('.flagResource:eq(' + findResourceDiv(result['id']).toString() + ')');
		
						$(flaggedResourceDiv).find('.recommender_problematicReason').text(result['reason']);
						if (result['isProblematic']) { $(flagDiv).addClass('problematic'); }
						else { $(flagDiv).removeClass('problematic'); }
						addTooltip();
						backToView();
					}
				});
			});
		
			/* Unflag the resource */
			$('.unflag_button').click(function() {
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
						var flaggedResourceDiv = $('.recommender_resource:eq(' + findResourceDiv(result['id']).toString() + ')');
						var flagDiv = $('.flagResource:eq(' + findResourceDiv(result['id']).toString() + ')');
		
						$(flaggedResourceDiv).find('.recommender_problematicReason').text(result['reason']);
						if (result['isProblematic']) { $(flagDiv).addClass('problematic'); }
						else { $(flagDiv).removeClass('problematic'); }
						addTooltip();
						backToView();
					}
				});
			});
		});

		addTooltip();
	}

    /* Add tooltips to each component */
	function addTooltip() {
		tooltipsCats.forEach(function(ele, ind) {
			$(ele).attr('title', tooltipsCatsText[ele]);
		});
 	}

    /* Find the position (index of div) of a resource based on the resource Id */
	function findResourceDiv(resourceId) {
		index = -1;
		$('.recommender_entryId').each(function(idx, ele){
			if (parseInt($(ele).text()) == resourceId) {
				index = idx;
				return false;
			}
		});
		return index;
	}

    /**
     * Delete, endorse or de-endorse a resource
     * These manipulations are restricted to course staff
     * TODO: endorsement and de-endorsement  
     */
    function addFunctionsForStaff() {
	    /* Check whether user is staff, if yes, bind the events for delete, endorsement and de-endorsement  */
		$.ajax({
			type: "POST",
			url: isUserStaffUrl,
			data: JSON.stringify({}),
			success: function(result) {
				if (result['is_user_staff']) {
					/* Add the button for entering staff-edit mode */
					$('.recommender_edit').append('<span class="ui-icon ui-icon-gear staffEdition"></span>');
					/* Add buttons in the staff-edit mode */
					staff_edit_textareas.forEach(function(ele, ind) {
						$('.staffEditionBlock').append('<div>' + staff_edit_textareas_text[ele] + '</div>')
							.append('<input type="text" class="' + ele + '" placeholder="' + staff_edit_textareas_placeholder[ele] + '"/><br/>');
					});
					staff_edit_buttons.forEach(function(ele, ind) {
						$('.staffEditionBlock').append('<input type="button" value="' + staff_edit_buttons_text[ele] + '" class="' + ele + '">');
						if (ind == 0) {
							$('.' + ele).attr('disabled', true);
							$('.staffEditionBlock').append('<div class="division_line"></div>');
						}
					});
					
					/* Check whether enough information is provided for S3, if yes, enable summission button */
					function enableS3Submit(divPtr) {
						var emptyFlag = false;
						staff_edit_textareas.forEach(function(ele, ind) {
							if ($('.' + ele).val() == '') {
								$('.submit_s3_info').attr('disabled', true);
								emptyFlag = true;
								return;
							}
						});
						if (!emptyFlag) { $('.submit_s3_info').attr('disabled', false); }
					}
					/* If the input (text) area is changed, check whether staff provides enough information for S3 */
					staff_edit_textareas.forEach(function(ele, ind) {
						$('.' + ele).bind('input propertychange', function() { enableS3Submit(); });
					});
					
					/* Submit the information for S3; this action is independent of selected resource */
					$('.submit_s3_info').click(function() {
						var data = {};
						staff_edit_textareas.forEach(function(ele, ind) {
							data[ele] = $('.' + ele).val();
						});
 						$.ajax({
							type: "POST",
							url: setS3InfoUrl,
							data: JSON.stringify(data),
							success: function(result) {
								if (result['Success']) { backToView(); }
								else { alert('Submission of S3 information is failed'); }
							}
						});
					});
					
					/* Enter staff-edit mode */
					$('.staffEdition').click(function() {
						$('.staffEditionBlock').show();
						$('.recommender_content').hide();
						$('.recommender_modify').show();
						$('.recommender_modify_title').text('Staff manipulation');
						$('.staffEditionBlock').find('input[type="text"]').val('');
						var data = {};
						data['id'] = parseInt($(this).parent().parent().find('.recommender_entryId').text());
						
						$('.delete_resource').unbind();
						/* Delete a selected resource */
						$('.delete_resource').click(function() {
							$.ajax({
								type: "POST",
								url: deleteResourceUrl,
								data: JSON.stringify(data),
								success: function(result) {
									if (result['Success']) {
										var deletedResourceIdx = findResourceDiv(result['id']);
										$('.recommender_resource:eq(' + deletedResourceIdx.toString() + ')').remove();
										/* Delete last resource */
										if ($('.recommender_resource').length == deletedResourceIdx) { deletedResourceIdx--; }
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
			}
		});
	}

    /* Initialize the interface */
	function initial() {
		backToView();
		$(".hide-show").click();
		addFunctionsForStaff();
		paginationRow();
		pagination();
		addResourceReset();
		bindEvent();
	
		if ($('.recommender_resource').length == 0) {
			$('.noResourceIntro').removeClass('hidden');
			$('.descriptionText').hide();
		}
	}
	initial();
}
