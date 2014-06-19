function RecommenderXBlock(runtime, element) {
    var handleUpvoteUrl = runtime.handlerUrl(element, 'handle_upvote');
    var handleDownvoteUrl = runtime.handlerUrl(element, 'handle_downvote');
    var addResourceUrl = runtime.handlerUrl(element, 'add_resource');
    var editResourceUrl = runtime.handlerUrl(element, 'edit_resource');
    var flagResourceUrl = runtime.handlerUrl(element, 'flag_resource');

    var baseUrl = 'http://s3-us-west-2.amazonaws.com/danielswli/';
    var currentPage = 1;
    var entriesPerPage = 5;
    var pageSpan = 2;

	/* resource list collapse or expansion */
    $(".hide-show").click(function () {
	  if ($(this).find('.hide-show-icon').text() == '▲') {
		$(this).find('.hide-show-icon').text('▼');
		$(".recommender_row_inner", element).slideUp('fast');
		$('.resource_add_button').css('visibility', 'hidden');
		$(this).css('cursor', 's-resize');
	  }
	  else {
		$(this).find('.hide-show-icon').text('▲');
	    $(".recommender_row_inner", element).slideDown('fast');
	    $('.resource_add_button').css('visibility', 'visible');
	    $(this).css('cursor', 'n-resize');
	  }
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
	  $('.pagination').empty();
	  $('.paginationCell').unbind();

      /* each paginationRow correspond to each page of resource list */
      for (var pageIdx = 1; pageIdx <= totalPage; pageIdx++) {
		var content = '<div class="paginationRow">';
		/* no previous page if current page = 1 */
		if (pageIdx == 1) { content += '<div class="paginationCell" style="visibility: hidden;">◄</div>'; }
		else { content += '<div class="paginationCell">◄</div>'; }

		if (pageIdx - pageSpan > 1) { content += '<div class="paginationCell" style="cursor: default;">...</div>'; }
		for (var i = pageIdx - pageSpan; i <= pageIdx + pageSpan; i++) {
			if (i == pageIdx) { content += '<div class="paginationCell" style="background-color: lightgrey;">' + i.toString() + '</div>'; }
			else if (i > 0 && i <= totalPage) { content += '<div class="paginationCell">' + i.toString() + '</div>'; }
		}
		if (pageIdx + pageSpan < totalPage) { content += '<div class="paginationCell" style="cursor: default;">...</div>'; }

        /* no next page if current page is last page */
		if (pageIdx == totalPage) { content += '<div class="paginationCell" style="visibility: hidden;">►</div>'; }
		else { content += '<div class="paginationCell">►</div>'; }

	    content += '</div>';	
	    $('.pagination').append(content);
      }

      /* page change */
      $('.paginationCell').click(function () {
	    var buttonText = $(this).text();
	
	    if (buttonText == '...') { return; }
        else if (buttonText == '◄') { currentPage -= 1; }
        else if (buttonText == '►') { currentPage += 1; }
        else { currentPage = parseInt(buttonText) }
        pagination();
      });
    }

    /* button for adding new resource */
    $('.resource_add_button').click(function() {
	  addResourceReset();
      $('.recommender_add').show();
      $('.recommender_content').hide();
	  $('.recommender_modify').show();
	  $('.recommender_modify_title').text('Recommend new resource');
    });

    /* change between different mode (resource list or add/edit mode) */
    function backToView() {
	  $('.recommender_add').hide();
	  $('.editSourceBlock').hide();
	  $('.recommender_modify').hide();
	  $('.recommender_content').show();
	  if ($('.recommender_row_top').css('cursor') == 's-resize') { $(".hide-show").click(); }
    }

    $('.backToViewButton').click(function(){
	  backToView();
    });

    /* prepare the form for uploading file to S3: TODO, handle this with pyfilesystem */
    var policyBase64 = 'CnsiZXhwaXJhdGlvbiI6ICIyMDIwLTEyLTAxVDEyOjAwOjAwLjAwMFoiLAogICJjb25kaXRpb25zIjogWwogICAgeyJidWNrZXQiOiAiZGFuaWVsc3dsaSJ9LAogICAgWyJzdGFydHMtd2l0aCIsICIka2V5IiwgInVwbG9hZHMvIl0sCiAgICB7ImFjbCI6ICJwdWJsaWMtcmVhZCJ9LAogICAgWyJzdGFydHMtd2l0aCIsICIkQ29udGVudC1UeXBlIiwgIiJdLAogICAgWyJjb250ZW50LWxlbmd0aC1yYW5nZSIsIDAsIDUyNDI4ODAwMF0KICBdCn0=';
    var signature = 'uRVljXwwHfM5K351eTL2MbYLwcI=';
    $('#addResourceForm').append('<input type="hidden" name="Policy" value="' + policyBase64 + '">'
          + '<input type="hidden" name="Signature" value="' + signature + '">'
          + 'Previewing screenshot: <input type="file" name="file"><br>'
          //+ '<input type="submit" class="submitAddResourceForm" name="submit" value="Upload File" style="margin-top: 0.5em">'
          + '<input type="button" value="Add resource" class="add_submit" style="margin-top: 0.5em" disabled >');

    /* initialize add resource mode */
    function addResourceReset() {
      $('.in_title').val('');
      $('.in_url').val('');
      $('#addResourceForm').find("input[name='file']").val('') 

      /* get time for unique filenames: TODO, randomize filenames */
      var key = "uploads/" + (new Date).getTime();
      $('#addResourceForm').find("input[name='key']").val(key);
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

    /* upload once student select a file */
    $('#addResourceForm').find("input[name='file']").change(function (){
	  if ($(this).val() == '') { return false; }
	  $("#addResourceForm").submit();
    });

    $("#addResourceForm").submit( function(e) {
      if ($('#addResourceForm').find("input[name='file']").val() == '') { return false; }
      enableAddSubmit();
      return true;
    });    

    /* submit the resource, save to database, update the current view */
    $('.add_submit').click(function() {
	    /* data: parameter passed to database */
        var data = {};
        data['resource'] = {};
        data['resource']['url'] = $('.in_url').val();
        data['resource']['title'] = $('.in_title').val();
        data['resource']['description'] = baseUrl + $(this).parent().find("input[name='key']").val();

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

                /* html for the new resource */
                var content = '<div class="recommender_resource">' +
                  '<div class="recommender_vote_box">' +
                  '<div class="recommender_vote_arrow_up nonevoting" role="button" aria-label="upvote" tabindex="0">' +
                  '<b>↑</b></div>' +
                  '<div class="recommender_vote_score nonevoting"><b>0</b></div>' +
                  '<div class="recommender_vote_arrow_down nonevoting" role="button" aria-label="downvote" tabindex="0">' +
                  '<b>↓</b></div>' +
                  '</div>' + 
                  '<div class="recommender_blurb"><div class="recommender_title">' + 
                  '<a href="' + data['resource']['url'] + '" target="_blank">' + data['resource']['title'] + '</a>' + '</div>' +
                  '<div class="recommender_url">' + data['resource']['url'] + 
                  '</div><div class="recommender_descriptionSlot">' + data['resource']['description'] +
                  '</div><div class="recommender_entryId">' + result['id'] +
                  '</div></div><div class="recommender_edit">' +
                  '<span class="ui-icon ui-icon-pencil resource_edit_button"></span>' +
                  '<span class="ui-icon ui-icon-flag flagResource notProblematic" title="Flag irrelevant resource">' +
                  '</span></div></div>';

                /* show the added resource at right place (pos), based on sorting the votes, and lead student to that page */
                if (pos == -1) {
	              $('.recommender_resource:last').after(content);
	              currentPage = Math.ceil($('.recommender_resource').length/entriesPerPage);
	            }
                else {
	              $('.recommender_resource:eq(' + pos.toString() + ')').before(content);
                  currentPage = Math.ceil((pos + 1)/entriesPerPage); 
                }
              }
              addResourceReset();
              unbindEvent();
              bindEvent();
              paginationRow();
			  pagination();
              backToView();
            }
        });
    });

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
                      scoreDiv.html('<b>' + (parseInt(scoreDiv.text()) + 2).toString() + '</b>');
                    }
					/* upvoting */
                    else if ($(divArrowUp).hasClass('nonevoting')) {
			     	  $(divArrowUp).parent().find('.nonevoting').removeClass('nonevoting').addClass('upvoting');
			          scoreDiv.html('<b>' + (parseInt(scoreDiv.text()) + 1).toString() + '</b>');
			        }
					/* undo upvoting */
			        else if ($(divArrowUp).hasClass('upvoting')) {
			     	  $(divArrowUp).parent().find('.upvoting').removeClass('upvoting').addClass('nonevoting');
			          scoreDiv.html('<b>' + (parseInt(scoreDiv.text()) - 1).toString() + '</b>');
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
                      scoreDiv.html('<b>' + (parseInt(scoreDiv.text()) + 1).toString() + '</b>');
                    }
					/* downvoting */
                    else if ($(divArrowDown).hasClass('nonevoting')) {
			     	  $(divArrowDown).parent().find('.nonevoting').removeClass('nonevoting').addClass('downvoting');
			          scoreDiv.html('<b>' + (parseInt(scoreDiv.text()) - 1).toString() + '</b>');
			        }
					/* change voting to downvoting */
			        else if ($(divArrowDown).hasClass('upvoting')) {
			     	  $(divArrowDown).parent().find('.upvoting').removeClass('upvoting').addClass('downvoting');
			          scoreDiv.html('<b>' + (parseInt(scoreDiv.text()) - 2).toString() + '</b>');
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
            $('.descriptionImg').empty();
            $('.descriptionImg').append('<img class="previewingImg" src="' 
              + $(this).find('.recommender_descriptionSlot').text() + '" height=100%>');
          }, function() {
          }
        );

		/* edit existing resource */
        $('.resource_edit_button').click(function() {
	      $('.editSourceBlock').show();
	      $('.recommender_content').hide();
  	      $('.recommender_modify').show();
	      $('.recommender_modify_title').text('Edit existing resource');
	
          $('.editSourceBlock').empty();
		  /* get time for unique filenames: TODO, randomize filenames */
          var key = "uploads/" + (new Date).getTime();
          /* prepare the form for uploading file to S3: TODO, handle this with pyfilesystem */
          var path = 'http://danielswli.s3.amazonaws.com/';
          var uploadForm = '<form id="editResourceForm" action="' + path + '" method="post" enctype="multipart/form-data">'
            + '<input type="hidden" name="key" value="' + key + '">'
            + '<input type="hidden" name="acl" value="public-read">'
            + '<input type="hidden" name="Content-Type" value="image/jpeg">'
            + '<input type="hidden" name="AWSAccessKeyId" value="AKIAIRDHSV6YZJZ4RFGA">'
            + '<input type="hidden" name="Policy" value="' + policyBase64 + '">'
            + '<input type="hidden" name="Signature" value="' + signature + '">'
            + 'Previewing screenshot: <input type="file" name="file"><br>'
            + '<input type="button" value="Edit resource" class="edit_submit" style="margin-top: 0.5em" disabled></form>';

          $('.editSourceBlock').append( 
            '<div class="editSourceBlockTitle">Edit the description, hypelink, and previewing screenshot for the selected resource</div>' +
            'Description: ' + '<input type="text" class="edit_title" style="height: 25px; position: relative; left: 10px;"><br>' +
            'HyperLink: <input type="text" class="edit_url" style="height: 25px; position: relative; left: 22px;"><br>' + uploadForm);
          
          /* initialize the text area */
          $('.edit_title').val($(this).parent().parent().find('.recommender_title').find('a').text());
          $('.edit_url').val($(this).parent().parent().find('.recommender_title').find('a').attr('href'));

          addTooltip();
          var divEdit = this;

		  /* check whether enough information (title/url) is provided for editing a resource, if yes, enable summission button */
          function enableEditSubmit() {
  		    if ($('.edit_title').val() == '' || $('.edit_url').val() == '') {
			  $('.edit_submit').attr('disabled', true);
		      return;
		    }
		    $('.edit_submit').attr('disabled', false);
  	      }

		  /* check whether the input text area is changed, if yes, check whether student can submit the resource */
	      $('.edit_title').bind('input propertychange', function() { enableEditSubmit(); });
	      $('.edit_url').bind('input propertychange', function() { enableEditSubmit(); });

          /* upload once student select a file */
          $('#editResourceForm').find("input[name='file']").change(function (){
  		    if ($(this).val() == '') { return false; }
            $("#editResourceForm").submit();
	      });
 
          $("#editResourceForm").submit( function(e) {
            if ($('#editResourceForm').find("input[name='file']").val() == '') { return false; }

            enableEditSubmit();
            return true;
          });

          /* submit the edited resource, save to database, update the current view */
          $('.edit_submit').click(function() {
			/* data: parameter passed to database */
            var data = {};
            data['resource'] = parseInt($(divEdit).parent().parent().find('.recommender_entryId').text());
            data['url'] = $('.edit_url').val();
            data['title'] = $('.edit_title').val();
            if (data['url'] == '' || data['title'] == '') { return; }
            if ($('#editResourceForm').find("input[name='file']").val() != '') { data['description'] = baseUrl + key; }

            $.ajax({
              type: "POST",
              url: editResourceUrl,
              data: JSON.stringify(data),
              success: function(result) {
                if (result['Success'] == true) {
				  /* show the edited resource */
	              $(divEdit).parent().parent().find('.recommender_title').find('a').text(data['title']);
	              $(divEdit).parent().parent().find('.recommender_title').find('a').attr('href', data['url']);
				  if ("description" in data) { $(divEdit).parent().parent().find('.recommender_descriptionSlot').text(data['description']); }
                  $('.editSourceBlock').empty();
                  backToView();
                }
              }
            });
          });
        });

		/* flag problematic resource: TODO */
        $('.flagResource').click(function() {
          var data = {};
          if ($(this).hasClass('notProblematic')) {
            data['isProblematic'] = 'problematic';
            $(this).removeClass('notProblematic').addClass('problematic');
          }
          else {
            data['isProblematic'] = 'notProblematic';
            $(this).removeClass('problematic').addClass('notProblematic');
          }
          data['resource'] = parseInt($(this).parent().parent().find('.recommender_entryId').text());
          $.ajax({
            type: "POST",
            url: flagResourceUrl,
            data: JSON.stringify(data)
          });
        });
        addTooltip();
      }
    
/*
    function findEntry(id) {
      var entryId = -1;
      $('.recommender_resource').find('.recommender_entryId').each(
        function(idx, ele){
          if ($(ele).text() == id) {
            entryId = idx;
            return;
          }
        }
      );
      return entryId;
    }*/

    function addTooltip() {
      $('.notProblematic').attr('title', 'Flag this resource as problematic and give the reason');
      $('.problematic').attr('title', 'Edit the reason of this problematic resource');
      $('.resource_add_button').attr('title', 'Recommend a new helpful resource for this problem with a short description, hyperlink, and previewing screenshot to the new resource');
      $('.resource_edit_button').attr('title', 'Edit the description, hypelink, and previewing screenshot of this resource');
      $('.recommender_vote_arrow_up').attr('title', 'Upvote for a helpful resource');
      $('.recommender_vote_arrow_down').attr('title', 'Downvote for an irrelevant resource');
      $('.recommender_vote_score').attr('title', 'Votes');
      $('.recommender_blurb').attr('title', 'The description of a helpful resource');
      $('.previewingImg').attr('title', 'Previewing screenshot');
      $('.in_title').attr('title', 'Type in the description of the resource');
      $('.in_url').attr('title', 'Type in the hyperlink to the resource');
      $('.edit_title').attr('title', 'Type in the description of the resource');
      $('.edit_url').attr('title', 'Type in the hyperlink to the resource');
      $('.backToViewButton').attr('title', 'Back to list of related resources');
      if ($('.recommender_row_top').find('.hide-show-icon').text() == '▲') { $('.recommender_row_top').attr('title', 'Select to hide the list'); }
      else { $('.recommender_row_top').attr('title', 'Select for expanding resource list' ); }
    }

    function initial() {
	  $(".hide-show").click();
	  $('.editSourceBlock').hide();
	  $('.recommender_add').hide();
	  $('.recommender_modify').hide();
	  paginationRow();
	  pagination();
	  addResourceReset();
	  bindEvent();
    }
    initial();
}
