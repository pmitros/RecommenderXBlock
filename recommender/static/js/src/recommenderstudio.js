function RecommenderXBlock(runtime, element) {
    /* Grab URLs from server */
    var setConfigUrl = runtime.handlerUrl(element, 'set_client_side_settings');
    
    /**
     * Bind the event for setting the student-view, client side configurations.
     */
    function bindConfigSettingEvent() {
        $('.configSubmit').click(function() {
            var data = {};
            data['DISABLE_DEV_UX'] = $('.developedUXDisable').val();
            data['ENTRIES_PER_PAGE'] = $('.entriesPerPage').val();
            data['PAGE_SPAN'] = $('.pageSpan').val();
            data['INTRO'] = $('.introEnable').val();

            $.ajax({
                type: "POST",
                url: setConfigUrl,
                data: JSON.stringify(data),
                success: function(result) {
                    if (result['Success'] == true) { alert('The configurations have been updated'); }
                }
            });
        });
    }

    bindConfigSettingEvent();
}
