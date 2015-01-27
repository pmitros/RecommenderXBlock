function RecommenderXBlock(runtime, element) {
    /* Grab URLs from server */
    var setConfigUrl = runtime.handlerUrl(element, 'set_client_side_settings');
    
    /**
     * Bind the event for setting the student-view, client side configurations.
     */
    function bindConfigSettingEvent() {
        $('.recommender_configSubmit').click(function() {
            var data = {};
            data['DISABLE_DEV_UX'] = $('.developedUXDisable').val() == 'true';
            data['ENTRIES_PER_PAGE'] = parseInt($('.entriesPerPage').val(), 10);
            data['PAGE_SPAN'] = parseInt($('.pageSpan').val(), 10);
            data['INTRO_ENABLE'] = $('.introEnable').val() == 'true';

            $.ajax({
                type: "POST",
                url: setConfigUrl,
                data: JSON.stringify(data),
                success: function(result) {
                    alert('The configurations have been updated');
                }
                error: function(result) {
                    alert('An internal error happened. We cannot set the configurations right now. Please try again later.');
                }
            });
        });
    }

    bindConfigSettingEvent();
}
