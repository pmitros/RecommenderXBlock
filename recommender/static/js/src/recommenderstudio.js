function RecommenderXBlock(runtime, element) {
    /* Grab URLs from server */
    var setConfigUrl = runtime.handlerUrl(element, 'set_client_configuration');
    
    /**
     * Bind the event for setting the student-view, client side configurations.
     */
    function bindConfigSettingEvent() {
        $('.recommender_configSubmit').click(function() {
            var data = {};
            data['disable_dev_ux'] = $('.developedUXDisable').val() == 'true';
            data['entries_per_page'] = parseInt($('.entriesPerPage').val(), 10);
            data['page_span'] = parseInt($('.pageSpan').val(), 10);
            data['intro_enable'] = $('.introEnable').val() == 'true';

            $.ajax({
                type: "POST",
                url: setConfigUrl,
                data: JSON.stringify(data),
                success: function(result) {
                    alert('The configurations have been updated');
                },
                error: function(result) {
                    alert('An internal error happened. We cannot set the configurations right now. Please try again later.');
                }
            });
        });
    }

    bindConfigSettingEvent();
}
