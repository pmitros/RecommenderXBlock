function RecommenderXBlock(runtime, element) {
/*
	$(document).tooltip({
      close: function(ev, ui) { addTooltip(); },
      open: function( ev, ui ) { 
        var tooltipDiv = $('div[id^="ui-tooltip-"]');
        if (tooltipDiv.length > 1) {
          $('div[id^="ui-tooltip-"]:lt(' + (tooltipDiv.length-1).toString() + ')').remove(); 
        } 
      }
    });*/
	
    var handleUpvoteUrl = runtime.handlerUrl(element, 'handle_upvote');
    var handleDownvoteUrl = runtime.handlerUrl(element, 'handle_downvote');
    var addResourceUrl = runtime.handlerUrl(element, 'add_resource');
    var editResourceUrl = runtime.handlerUrl(element, 'edit_resource');
    var flagResourceUrl = runtime.handlerUrl(element, 'flag_resource');

    var showedResourceLength = 3;
    var showedResourceIncrement = 2;

    var baseUrl = 'http://s3-us-west-2.amazonaws.com/danielswli/'

    $('.resource_add_button').click(function() {
      $('.recommender_add').show();
    });
    $('.resource_edit_button').click(function() {
      $('.editSourceBlock').show();
    });
    $(document).bind('cbox_closed', function(){
      $('.recommender_add').hide();
      $('.editSourceBlock').hide();
    });
    $(".inline").colorbox({
      inline:true, 
      width:"50%",
      title:""
    });


    var policyBase64 = 'CnsiZXhwaXJhdGlvbiI6ICIyMDIwLTEyLTAxVDEyOjAwOjAwLjAwMFoiLAogICJjb25kaXRpb25zIjogWwogICAgeyJidWNrZXQiOiAiZGFuaWVsc3dsaSJ9LAogICAgWyJzdGFydHMtd2l0aCIsICIka2V5IiwgInVwbG9hZHMvIl0sCiAgICB7ImFjbCI6ICJwdWJsaWMtcmVhZCJ9LAogICAgWyJzdGFydHMtd2l0aCIsICIkQ29udGVudC1UeXBlIiwgIiJdLAogICAgWyJjb250ZW50LWxlbmd0aC1yYW5nZSIsIDAsIDUyNDI4ODAwMF0KICBdCn0=';
    var signature = 'uRVljXwwHfM5K351eTL2MbYLwcI=';
    $('#addResourceForm').append('<input type="hidden" name="Policy" value="' + policyBase64 + '">'
          + '<input type="hidden" name="Signature" value="' + signature + '">'
          + 'Previewing screenshot: <input type="file" name="file"><br>'
          + '<input type="submit" class="submitAddResourceForm" name="submit" value="Upload File">'
          + '<input type="button" value="Add resource" class="add_submit" disabled>');

    function addResourceReset() {
      $('.in_title').val('');
      $('.in_url').val('')
      $('#addResourceForm').find("input[name='file']").val('') 

      var key = "uploads/" + (new Date).getTime();
      $('#addResourceForm').find("input[name='key']").val(key);
      $('.add_submit').attr('disabled', true);
      $('.submitAddResourceForm').attr('disabled', false);
    }
    addResourceReset();

    $("#addResourceForm").submit( function(e) {
      if ($('#addResourceForm').find("input[name='file']").val() == '') { return false; }

      $('.add_submit').attr('disabled', false);
      $('.submitAddResourceForm').attr('disabled', true);
      return true;
    });    

    $('.add_submit').click(function() {
        var data = {};
        data['resource'] = {};
        data['resource']['url'] = $('.in_url').val();
        data['resource']['title'] = $('.in_title').val();
        data['resource']['description'] = baseUrl + $(this).parent().find("input[name='key']").val();
//        data['resource']['description'] = $(this).parent().find('.in_description').val();

        $.ajax({
            type: "POST",
            url: addResourceUrl,
            data: JSON.stringify(data),
            success: function(result) {
              if (result['Success'] == true) {
                var pos = -1;
                $('.recommender_vote_score').each(function(idx, ele){ 
                  if (parseInt($(ele).text()) < 0) {
                    pos = idx;
                    return false;
                  }
                });

                var content = '<div class="recommender_resource">' +
                  '<div class="recommender_vote_box">' +
                  '<div class="recommender_vote_arrow_up" role="button" aria-label="upvote" tabindex="0">' +
                  '↑</div>' +
                  '<div class="recommender_vote_score">0</div>' +
                  '<div class="recommender_vote_arrow_down" role="button" aria-label="downvote" tabindex="0">' +
                  '↓</div>' +
                  '</div>' + 
                  '<div class="recommender_blurb"><div class="recommender_title">' + 
                  data['resource']['title'] + '</div>' +
                  '<div class="recommender_url">' + data['resource']['url'] + 
                  '</div><div class="recommender_descriptionSlot">' + data['resource']['description'] +
                  '</div><div class="recommender_entryId">' + result['id'] +
                  '</div></div><div class="recommender_edit">' +
                  '<a class="inline cboxElement resource_edit_button" href="#editSourceBlock">' + 
                  '<span class="ui-icon ui-icon-pencil editResource"></span></a>' +
                  '<span class="ui-icon ui-icon-flag flagResource notMisuse" title="Flag irrelevant resource">' +
                  '</span></div></div>';

                if (pos == -1) { $('.resource_list_more').before(content); }
                else { $('.recommender_resource:eq(' + pos.toString() + ')').before(content); }
              }
              addResourceReset();
              unbindEvent();
              bindEvent();
              //addTooltip();
              $.colorbox.close();
            }
        });
    });

    function unbindEvent() {
      $('.recommender_vote_arrow_up').unbind();
      $('.recommender_vote_arrow_down').unbind();
      $('.recommender_blurb').unbind();
      $('.recommender_resource').unbind();
      $('.editResource').unbind();
      $('.flagResource').unbind();
    }

    function bindEvent() {
        $('.recommender_vote_arrow_up').click(function() {
            var data = {};
            data['resource'] = parseInt($(this).parent().parent().find('.recommender_entryId').text());
//            data['resource'] = findEntry($(this).parent().parent().find('.recommender_entryId').text());
            if (data['resource'] == -1) { return; }
            var divArrowUp = this;
            $.ajax({
                type: "POST",
                url: handleUpvoteUrl,
                data: JSON.stringify(data),
                success: function(result) {
                  if (result['Success'] == true) {
                    var scoreDiv = $(divArrowUp).parent().find('.recommender_vote_score');
                    scoreDiv.text((parseInt(scoreDiv.text()) + 1).toString());
                  }
                }
            });
        });

        $('.recommender_vote_arrow_down').click(function() {
            var data = {};
            data['resource'] = parseInt($(this).parent().parent().find('.recommender_entryId').text());
//            data['resource'] = findEntry($(this).parent().parent().find('.recommender_entryId').text());
            if (data['resource'] == -1) { return; }
            var divArrowDown = this;
	    $.ajax({
                type: "POST",
                url: handleDownvoteUrl,
                data: JSON.stringify(data),
                success: function(result) {
                  if (result['Success'] == true) {
                    var scoreDiv = $(divArrowDown).parent().find('.recommender_vote_score');
                    scoreDiv.text((parseInt(scoreDiv.text()) - 1).toString());
                  }
                }
	    });
        });

        $('.recommender_blurb').click(function(){
          var win = window.open($(this).find('.recommender_url').text(), '_blank');
          win.focus();
        });

        $('.recommender_resource').hover(
          function() {
            $('.recommender_resource').removeClass('resource_hovered');
            $(this).addClass('resource_hovered');
            $('.descriptionImg').empty();
            $('.descriptionImg').append('<img class="previewingImg" src="' 
              + $(this).find('.recommender_descriptionSlot').text() + '" height=100%>');
          }, function() {
          // $('.descriptionImg').empty();
          }
        );

      $('.editResource').click(function() {
        $('.editSourceBlock').empty();
        var key = "uploads/" + (new Date).getTime();
        var path = 'http://danielswli.s3.amazonaws.com/';
        var uploadForm = '<form id="editResourceForm" action="' + path + '" method="post" enctype="multipart/form-data">'
          + '<input type="hidden" name="key" value="' + key + '">'
          + '<input type="hidden" name="acl" value="public-read">'
          + '<input type="hidden" name="Content-Type" value="image/jpeg">'
          + '<input type="hidden" name="AWSAccessKeyId" value="AKIAIRDHSV6YZJZ4RFGA">'
          + '<input type="hidden" name="Policy" value="' + policyBase64 + '">'
          + '<input type="hidden" name="Signature" value="' + signature + '">'
          + 'Previewing screenshot: <input type="file" name="file"><br>'
          + '<input type="submit" class="submitEditResourceForm" name="submit" value="Upload File">'
          + '<input type="button" value="Edit resource" class="edit_submit" disabled></form>';

        $('.editSourceBlock').append(
          '<div class="editSourceBlockTitle">Edit the description, hypelink, and previewing screenshot for the selected resource</div>' +
          'Description: ' + '<input type="text" class="edit_title"><br>' +
          'HyperLink: <input type="text" class="edit_url"><br>' + uploadForm);
          //'Edited resource description: ' +
          //'<input type="text" class="edit_description"><br>' +

        addTooltip();
        var divEdit = this;

        $("#editResourceForm").submit( function(e) {
          if ($('#editResourceForm').find("input[name='file']").val() == '') { return false; }

          $('.edit_submit').attr('disabled', false);
          $('.submitEditResourceForm').attr('disabled', 'disabled'); 
          return true;
        });

        $('.edit_submit').click(function() {
          var data = {};
          data['resource'] = parseInt($(divEdit).parent().parent().parent().find('.recommender_entryId').text());
//          data['resource'] = findEntry($(divEdit).parent().parent().find('.recommender_entryId').text());
          data['url'] = $('.edit_url').val();
          data['title'] = $('.edit_title').val();
          if (data['url'] == '' || data['title'] == '') { return; }

          data['description'] = baseUrl + key;
          $.ajax({
              type: "POST",
              url: editResourceUrl,
              data: JSON.stringify(data),
              success: function(result) {
                if (result['Success'] == true) {
                  $(divEdit).parent().parent().parent().find('.recommender_title').text(data['title']);
                  $(divEdit).parent().parent().parent().find('.recommender_url').text(data['url']);
                  $(divEdit).parent().parent().parent().find('.recommender_descriptionSlot').text(data['description']);
                  $('.editSourceBlock').empty();
                  $.colorbox.close();
                }
              }
          });
        });
      });

      $('.flagResource').click(function() {
        var data = {};
        if ($(this).hasClass('notMisuse')) {
          data['isMisuse'] = 'misuse';
          $(this).removeClass('notMisuse').addClass('misuse');
        }
        else {
          data['isMisuse'] = 'notMisuse';
          $(this).removeClass('misuse').addClass('notMisuse');
        }
//        data['resource'] = findEntry($(this).parent().parent().find('.recommender_entryId').text());
        data['resource'] = parseInt($(this).parent().parent().find('.recommender_entryId').text());
        $.ajax({
            type: "POST",
            url: flagResourceUrl,
            data: JSON.stringify(data)
        });
      });

      addTooltip();
    }
    bindEvent();

    $('.resource_list_more').click(function() { showResource(showedResourceIncrement); });
    $('.resource_list_less').click(function() { 
      $('.recommender_resource').addClass('hidden');
      showResource(-showedResourceIncrement); 
    });

    function showResource(increment) {
      showedResourceLength += increment;
      if (showedResourceLength < 1) { showedResourceLength = 1; }
      if (showedResourceLength > $('.recommender_resource').length)
        showedResourceLength = $('.recommender_resource').length; 
      $('.recommender_resource:lt(' + showedResourceLength.toString() + ')').removeClass('hidden');
    }
    showResource(0);

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
    }

    function addTooltip() {
      $('.notMisuse').attr('title', 'Flag this resource as irrelevant');
      $('.misuse').attr('title', 'Flag this resource as helpful');
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
    }

//    addTooltip();
/*    $('.ui-icon-zoomin').click(function(){
        //alert($(this).parent().parent().find('.recommender_url').text());
        $(this).colorbox({iframe:true, width:800, height:600, href:$(this).parent().parent().find('.recommender_url').text()});
    });*/
}
