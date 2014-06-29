if (typeof Logger == 'undefined') {
	var Logger = {
		log: function(a) { return; }
	}
}

function RecommenderXBlock(runtime, element) {
	var handleUpvoteUrl = runtime.handlerUrl(element, 'handle_upvote');
	var handleDownvoteUrl = runtime.handlerUrl(element, 'handle_downvote');
	var addResourceUrl = runtime.handlerUrl(element, 'add_resource');
	var editResourceUrl = runtime.handlerUrl(element, 'edit_resource');
	var flagResourceUrl = runtime.handlerUrl(element, 'flag_resource');
	var uploadScreenshotUrl = runtime.handlerUrl(element, 'upload_screenshot');
	var isUserStaffUrl = runtime.handlerUrl(element, 'is_user_staff');
	var deleteResourceUrl = runtime.handlerUrl(element, 'delete_resource');

	var baseUrl = 'http://s3-us-west-2.amazonaws.com/danielswli/';
	var currentPage = 1;
	var entriesPerPage = 5;
	var pageSpan = 2;

	/* resource list collapse or expansion */
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

	/* show content/icon for different page */
	function pagination() {
		/* show resource for each page */
		$('.recommender_resource').each(function(index, element) {
			if (index < (currentPage-1)*entriesPerPage || index >= currentPage*entriesPerPage) { $(element).hide(); }
			else { $(element).show(); }
		});

		/* change icon for each page */
		$('.paginationRow').each(function(index, element) {
			if (index + 1 == currentPage) { $(element).show(); }
			else { $(element).hide(); }
		});
	}
	
	/* creating pagination (icon and page-change event) for each page of resource list */
	function paginationRow() {
		var totalPage = Math.ceil($('.recommender_resource').length/entriesPerPage);
		$('.paginationRow').remove();
		$('.paginationCell').unbind();
		if (totalPage == 1) { return; }

		/* each paginationRow correspond to each page of resource list */
		for (var pageIdx = 1; pageIdx <= totalPage; pageIdx++) {
			var paginationRowDiv = $('.paginationRowTemplate').clone().removeClass('hidden').removeClass('paginationRowTemplate').addClass('paginationRow');
			/* no previous page if current page = 1 */
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
			/* no next page if current page is last page */
			if (pageIdx == totalPage) { paginationRowDiv.find('.rightArrowIcon').css("visibility", "hidden"); }

			$('.pagination').append(paginationRowDiv);
		}

		/* page change */
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
	
    /* change between different mode (resource list or add/edit mode) */
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

	$('.backToViewButton').click(function() {
		Logger.log('backToView.click.event', {
			'status': 'Back to resource list mode'
		});
		backToView();
	});
	
	/* button for adding new resource */
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

	/* initialize add resource mode */
	function addResourceReset() {
		$('.in_title').val('');
		$('.in_url').val('');
		$('.in_descriptionText').val('');
		$('#addResourceForm').find("input[name='file']").val('');
		$('.add_submit').attr('disabled', true);
	}

	/* check whether enough information (title/url) is provided for recommending a resource, if yes, enable summission button */
	function enableAddSubmit(divPtr) {
		if ($('.in_title').val() == '' || $('.in_url').val() == '') {
			$('.add_submit').attr('disabled', true);
			return;
		}
		$('.add_submit').attr('disabled', false);
	}

	/* check whether the input text area is changed, if yes, check whether student can submit the resource */
	$('.in_title').bind('input propertychange', function() { enableAddSubmit(); });
	$('.in_url').bind('input propertychange', function() { enableAddSubmit(); });

	/* upload screenshot, submit the resource, save to database, update the current view */
	$('.add_submit').click(function() {
		/* data: parameter passed to database */
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
		
		if ($(formDiv).find("input[name='file']").val() == '') { addResource(data); }
		else {
			/* upload once student select a file */
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
					if (result.responseText == 'FILETYPEERROR') {
						alert('Please upload an image');
						$(formDiv).find("input[name='file']").val('');
					}
					else {
						/* update new entry */
						data['description'] = baseUrl + result.responseText;
						addResource(data);
					}
				},
			});
		}
	});

	function addResource(data) {
		$.ajax({
			type: "POST",
			url: addResourceUrl,
			data: JSON.stringify(data),
			success: function(result) {
				if (result['Success'] == true) {
					/* decide the rigth place for the added resource (pos), based on sorting the votes */
					var pos = -1;
					$('.recommender_vote_score').each(function(idx, ele){ 
						if (parseInt($(ele).text()) < 0) {
							pos = idx;
							return false;
						}
					});

					/* show the added resource at right place (pos), based on sorting the votes, and lead student to that page */
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
					/* div for the new resource */
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
					//unbindEvent();
					//bindEvent();
					paginationRow();
					pagination();
					backToView();
				}
				else { alert('add redundant resource'); }
			}
		});
	}

    /* unbind event for each entry of resources */
	function unbindEvent() {
		$('.recommender_vote_arrow_up').unbind();
		$('.recommender_vote_arrow_down').unbind();
		$('.recommender_resource').unbind();
		$('.resource_edit_button').unbind();
		$('.flagResource').unbind();
	}

	/* bind event for each entry of resources */
	function bindEvent() {
		/* upvoting event */
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

		/* downvoting event */
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

		/* show preview when hover a entry of resource*/
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

		/* edit existing resource */
		$('.resource_edit_button').click(function() {
			$('.editSourceBlock').show();
			$('.recommender_content').hide();
			$('.recommender_modify').show();
			$('.recommender_modify_title').text('Edit existing resource');
			var resourceDiv = $(this).parent().parent();
	
			/* data: parameter passed to database */
			var data = {};
			data['id'] = parseInt(resourceDiv.find('.recommender_entryId').text());
	
			/* initialize the text area */
			$('.edit_title').val(resourceDiv.find('.recommender_title').find('a').text());
			$('.edit_url').val(resourceDiv.find('.recommender_title').find('a').attr('href'));
			$('.edit_descriptionText').val(resourceDiv.find('.recommender_descriptionText').text());
			$('#editResourceForm').find("input[name='file']").val('');
			$('.edit_submit').attr('disabled', true);
	
			Logger.log('editResource.click.event', {
				'status': 'Entering edit resource mode',
				'id': data['id']
			});

			/* check whether enough information (title/url) is provided for editing a resource, if yes, enable summission button */
			function enableEditSubmit() {
				if ($('.edit_title').val() == '' || $('.edit_url').val() == '') {
					$('.edit_submit').attr('disabled', true);
					return;
				}
				$('.edit_submit').attr('disabled', false);
			}

			/* check whether the input text area is changed, if yes, check whether student can submit the resource */
			$('.edit_title,.edit_url,.edit_descriptionText').unbind();
			$('.edit_title,.edit_url,.edit_descriptionText').bind('input propertychange', function() { enableEditSubmit(); });
			$('#editResourceForm').find("input[name='file']").unbind();
			$('#editResourceForm').find("input[name='file']").change(function() {
				if ($(this).val() != '') { enableEditSubmit(); }
			});

			/* upload the screen shot, submit the edited resource, save to database, update the current view */
			$('.edit_submit').unbind();
			$('.edit_submit').click(function() {
				/* data: parameter passed to database */
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

				if ($(formDiv).find("input[name='file']").val() == '') { editResource(data); }
				else {
					/* upload once student select a file */
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
							if (result.responseText == 'FILETYPEERROR') {
								alert('Please upload an image');
								$(formDiv).find("input[name='file']").val('');
							}
							else {
								/* update new entry */
								data['description'] = baseUrl + result.responseText;
								editResource(data);
							}
						},
					});
				}
	
				function editResource (data) {
					$.ajax({
						type: "POST",
						url: editResourceUrl,
						data: JSON.stringify(data),
						success: function(result) {
							if (result['Success'] == true) {
								var resourceDiv = $('.recommender_resource:eq(' + findResourceDiv(result['id']).toString() + ')');
	
								/* show the edited resource */
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

		/* flag problematic resource */
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

			/* record the reason for problematic resource */ 
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
		
			/* unflag the resource */
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

	function addTooltip() {
		tooltipsCats.forEach(function(ele, ind) {
			$(ele).attr('title', tooltipsCatsText[ele]);
		});
 	}

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

    function addFunctionsForStaff() {
		$.ajax({
			type: "POST",
			url: isUserStaffUrl,
			data: JSON.stringify({}),
			success: function(result) {
				if (result['is_user_staff']) {
					$('.recommender_edit').append('<span class="ui-icon ui-icon-gear staffEdition"></span>');
					
					$('.staffEdition').click(function() {
						$('.staffEditionBlock').show();
						$('.recommender_content').hide();
						$('.recommender_modify').show();
						$('.recommender_modify_title').text('Staff manipulation');
						var data = {};
						data['id'] = parseInt($(this).parent().parent().find('.recommender_entryId').text());
						
						$('.delete_resource').unbind();
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
