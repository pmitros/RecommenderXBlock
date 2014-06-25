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
		//$('.resource_add_button').css('visibility', 'hidden');
		$(this).css('cursor', 's-resize');
	  }
	  else {
		Logger.log('hide-show.click.event', {
		    'status': 'show'
		});
	    $(".recommender_row_inner", element).slideDown('fast');
	    //$('.resource_add_button').css('visibility', 'visible');
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
	  if (totalPage == 1) { return; }
	  $('.paginationRow').remove();
	  $('.paginationCell').unbind();

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
	
	  /* Don't trigger event bound to parent div */ 
	  /*
	  (function(e) {
	    var e = window.event || e;
        if (e.stopPropagation) e.stopPropagation();
        else e.cancelBubble = true;
      })(event);
      */
    });

    /* change between different mode (resource list or add/edit mode) */
    function backToView() {
	  $('.recommender_modify').hide();
	  $('.flagSourceBlock').hide();
      $('.editSourceBlock').hide();
      $('.recommender_add').hide();
	  $('.recommender_content').show();
	  //if ($('.recommender_row_top').css('cursor') == 's-resize') { $(".hide-show").click(); }
    }

    $('.backToViewButton').click(function() {
	  Logger.log('backToView.click.event', {
	    'status': 'Back to resource list mode'
	  });
	  backToView();
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
        data['resource'] = {};
        data['resource']['url'] = $('.in_url').val();
        data['resource']['title'] = $('.in_title').val();
        data['resource']['descriptionText'] = $('.in_descriptionText').val();
        data['resource']['description'] = '';
        var formDiv = $('#addResourceForm');
		var file = new FormData($(formDiv)[0]);
        Logger.log('addResource.click.event', {
		  'status': 'Add new resource',
		  'title': data['resource']['title'],
		  'url': data['resource']['url'],
		  'description': $(formDiv).find("input[name='file']").val(),
		  'descriptionText': data['resource']['descriptionText']
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
                  data['resource']['description'] = baseUrl + result.responseText;
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
              var newDiv = $('.recommender_resourceTemplate').clone().removeClass('hidden').removeClass('recommender_resourceTemplate').addClass('recommender_resource');
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
              var newDiv = $(toDiv).clone();
            }
            /* div for the new resource */
            $(newDiv).find('.recommender_vote_arrow_up,.recommender_vote_score,.recommender_vote_arrow_down')
              .removeClass('downvoting').removeClass('upvoting').addClass('nonevoting');
            $(newDiv).find('.recommender_vote_score').text('0');
            $(newDiv).find('a').attr('href', data['resource']['url']);
            $(newDiv).find('a').text(data['resource']['title']);
            $(newDiv).find('.recommender_descriptionImg').text(data['resource']['description']);
			$(newDiv).find('.recommender_descriptionText').text(data['resource']['descriptionText']);
            $(newDiv).find('.recommender_entryId').text(result['id']);
            $(newDiv).find('.recommender_problematicReason').text('');
            $(newDiv).find('.flagResource').removeClass('problematic');

            if ($('.recommender_resource').length == 0) { $('.recommender_resourceTemplate').before(newDiv); }
	        else {
              if (pos == -1) { $(toDiv).after(newDiv); }
              else { $(toDiv).before(newDiv); }
            }

            addResourceReset();
            unbindEvent();
            bindEvent();
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
            data['resource'] = parseInt($(this).parent().parent().find('.recommender_entryId').text());
            if (data['resource'] == -1) { return; }
            Logger.log('arrowUp.click.event', {
			  'status': 'Arrow up',
			  'id': data['resource']
			});
			
            var divArrowUp = this;
            $.ajax({
                type: "POST",
                url: handleUpvoteUrl,
                data: JSON.stringify(data),
                success: function(result) {
                  if (result['Success'] == true) {
                    var scoreDiv = $(divArrowUp).parent().find('.recommender_vote_score');
					/* change downvoting to upvoting */
                    if ($(divArrowUp).hasClass('downvoting')) {
                      $(divArrowUp).parent().find('.downvoting').removeClass('downvoting').addClass('upvoting');
                      scoreDiv.html((parseInt(scoreDiv.text()) + 2).toString());
                    }
					/* upvoting */
                    else if ($(divArrowUp).hasClass('nonevoting')) {
			     	  $(divArrowUp).parent().find('.nonevoting').removeClass('nonevoting').addClass('upvoting');
			          scoreDiv.html((parseInt(scoreDiv.text()) + 1).toString());
			        }
					/* undo upvoting */
			        else if ($(divArrowUp).hasClass('upvoting')) {
			     	  $(divArrowUp).parent().find('.upvoting').removeClass('upvoting').addClass('nonevoting');
			          scoreDiv.html((parseInt(scoreDiv.text()) - 1).toString());
			        }
                  }
                }
            });
        });

		/* downvoting event */
        $('.recommender_vote_arrow_down').click(function() {
            var data = {};
            data['resource'] = parseInt($(this).parent().parent().find('.recommender_entryId').text());
            if (data['resource'] == -1) { return; }
            Logger.log('arrowDown.click.event', {
			  'status': 'Arrow down',
			  'id': data['resource']
			});

            var divArrowDown = this;
	        $.ajax({
                type: "POST",
                url: handleDownvoteUrl,
                data: JSON.stringify(data),
                success: function(result) {
                  if (result['Success'] == true) {
                    var scoreDiv = $(divArrowDown).parent().find('.recommender_vote_score');
					/* undo downvoting */
                    if ($(divArrowDown).hasClass('downvoting')) {
                      $(divArrowDown).parent().find('.downvoting').removeClass('downvoting').addClass('nonevoting');
                      scoreDiv.html((parseInt(scoreDiv.text()) + 1).toString());
                    }
					/* downvoting */
                    else if ($(divArrowDown).hasClass('nonevoting')) {
			     	  $(divArrowDown).parent().find('.nonevoting').removeClass('nonevoting').addClass('downvoting');
			          scoreDiv.html((parseInt(scoreDiv.text()) - 1).toString());
			        }
					/* change voting to downvoting */
			        else if ($(divArrowDown).hasClass('upvoting')) {
			     	  $(divArrowDown).parent().find('.upvoting').removeClass('upvoting').addClass('downvoting');
			          scoreDiv.html((parseInt(scoreDiv.text()) - 2).toString());
			        }
			      }
                }
	        });
        });

		/* show preview when hover a entry of resource*/
        $('.recommender_resource').hover(
          function() {
            $('.recommender_resource').removeClass('resource_hovered');
            $(this).addClass('resource_hovered');
//            $('.descriptionText').hide();
            $('.previewingImg').removeClass('hidden');
            $('.previewingImg').attr('src', $(this).find('.recommender_descriptionImg').text());
            $('.descriptionText').text($(this).find('.recommender_descriptionText').text());

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
	
          /* initialize the text area */
          $('.edit_title').val($(this).parent().parent().find('.recommender_title').find('a').text());
          $('.edit_url').val($(this).parent().parent().find('.recommender_title').find('a').attr('href'));
          $('.edit_descriptionText').val($(this).parent().parent().find('.recommender_descriptionText').text());
          $('#editResourceForm').find("input[name='file']").val('');
	      $('.edit_submit').attr('disabled', true);
	      var divEdit = this;
	
	      Logger.log('editResource.click.event', {
			'status': 'Entering edit resource mode',
			'id': $(this).parent().parent().find('.recommender_entryId').text()
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
            var data = {};
            data['resource'] = parseInt($(divEdit).parent().parent().find('.recommender_entryId').text());
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
			  'id': $(divEdit).parent().parent().find('.recommender_entryId').text()
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
				    /* show the edited resource */
	                $(divEdit).parent().parent().find('.recommender_title').find('a').text(data['title']);
	                $(divEdit).parent().parent().find('.recommender_title').find('a').attr('href', data['url']);
				    if (data["description"] != "") { $(divEdit).parent().parent().find('.recommender_descriptionImg').text(data['description']); }
				    if (data["descriptionText"] != "") { $(divEdit).parent().parent().find('.recommender_descriptionText').text(data['descriptionText']); }
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

          Logger.log('flagResource.click.event', {
			'status': 'Entering flag resource mode',
			'id': $(flaggedResourceDiv).find('.recommender_entryId').text()
		  });

          /* record the flagging once user click on the flag button */
          /*
          if (!$(this).hasClass('problematic')) {
            data = {};
            data['resource'] = parseInt($(flaggedResourceDiv).find('.recommender_entryId').text());
            data['reason'] = '';
            data['isProblematic'] = true;
	        $.ajax({
	          type: "POST",
	          url: flagResourceUrl,
	          data: JSON.stringify(data),
	          success: function(result) {
		        $(flagDiv).addClass('problematic');
		        addTooltip();
	          }
	        });
	      }
	      */
	      $('.flag_reason_submit').unbind();
	      $('.unflag_button').unbind();
	
	      /* record the reason for problematic resource */ 
	      $('.flag_reason_submit').click(function() {
            data = {};
            data['resource'] = parseInt($(flaggedResourceDiv).find('.recommender_entryId').text());
            data['reason'] = $('.flag_reason').val();
            data['isProblematic'] = true;
            Logger.log('flagResource.click.event', {
			  'status': 'Flagging resource',
			  'id': $(flaggedResourceDiv).find('.recommender_entryId').text(),
			  'reason': data['reason'],
			  'isProblematic': true
			});

            $.ajax({
	            type: "POST",
	            url: flagResourceUrl,
	            data: JSON.stringify(data),
	            success: function(result) {
		          $(flaggedResourceDiv).find('.recommender_problematicReason').text(data['reason']);
		          backToView();
	            }
	        });
	      });
		
		  /* unflag the resource */
		  $('.unflag_button').click(function() {
            data = {};
            data['resource'] = parseInt($(flaggedResourceDiv).find('.recommender_entryId').text());
            data['isProblematic'] = false;
            Logger.log('flagResource.click.event', {
			  'status': 'Unflagging resource',
			  'id': $(flaggedResourceDiv).find('.recommender_entryId').text(),
			  'isProblematic': false
			});
			
            $.ajax({
	            type: "POST",
	            url: flagResourceUrl,
	            data: JSON.stringify(data),
	            success: function(result) {
		          $(flagDiv).removeClass('problematic');
		          $(flaggedResourceDiv).find('.recommender_problematicReason').text('');
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

    function initial() {
	  $(".hide-show").click();
	  $('.recommender_modify').hide();
	  $('.flagSourceBlock').hide();
      $('.editSourceBlock').hide();
      $('.recommender_add').hide();
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
