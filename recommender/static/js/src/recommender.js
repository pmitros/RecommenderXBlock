function RecommenderXBlock(runtime, element) {
    var handlerUrl = runtime.handlerUrl(element, 'handle_upvote');

    function voted(result) { console.log("Voted"); }

    $('.recommender_vote_arrow_up', element).click(function(){
	$.ajax({
            type: "POST",
            url: handlerUrl,
            data: JSON.stringify({}),
            success: voted
	});
    });
}