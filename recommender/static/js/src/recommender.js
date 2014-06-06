function RecommenderXBlock(runtime, element) {
    var handlerUrl = runtime.handlerUrl(element, 'handle_upvote');
    
    function voted(result) {
        console.log("Voted");
    }
    
    $('.recommender_vote_arrow_up', element).click(function(){
        var myVote = $(this).parent().find('.recommender_vote_score').text();
        $(this).parent().find('.recommender_vote_score').text(parseInt(myVote) + 1);
	$.ajax({
            type: "POST",
            url: handlerUrl,
            data: JSON.stringify({}),
            success: voted
	});
    });

    $('.recommender_blurb').click(function(){
        var win = window.open($(this).find('.recommender_url').text(), '_blank');
        win.focus();
    });

    $('.recommender_resource').hover(
      function() {
        $('.thumbnailImg').empty();
        $('.thumbnailImg').append('<img src="' + $(this).find('.recommender_thumbnail').text() + '" height=100%>');
      }, function() {
       // $('.thumbnailImg').empty();
      }
    );

/*    $('.ui-icon-zoomin').click(function(){
        //alert($(this).parent().parent().find('.recommender_url').text());
        $(this).colorbox({iframe:true, width:800, height:600, href:$(this).parent().parent().find('.recommender_url').text()});
    });*/
}
