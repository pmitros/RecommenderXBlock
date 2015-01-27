var tooltipsCatsPerResource = [
    '.recommender_resourceEditButton',
    '.recommenderVoteArrowUp',
    '.recommenderVoteArrowDown',
    '.recommenderVoteScore',
    'a',
    '.recommender_flagResource',
    '.recommender_remove',
    '.recommender_endorse.recommender_endorsed'
];

var tooltipsCats = [
    '.recommender_resourceAddButton',
    '.recommender_previewingImg',
    '.recommender_inTitle',
    '.recommender_inUrl',
    '.recommender_inDescriptionText',
    '.addResourceScreenshot',
    '.recommender_backToViewButton',
    '.recommender_flagReason',
    '.deleteResource',
    '.recommender_hideShow.recommender_resourceListExpanded',
    '.recommender_resourceRankingForRemovalButton.recommender_removeMode'
];

var tooltipsEditCats = [
    '.recommender_editTitle',
    '.recommender_editUrl',
    '.recommender_editDescriptionText',
    '.editResourceScreenshot'
];

var tooltipsCatsText = {
    '.recommender_resourceAddButton': '<span>Recommend a new resource which may be helpful to other students solving this problem</span>',
    '.recommender_resourceEditButton': '<span>Edit this resource</span>',
    '.recommenderVoteArrowUp': '<span>Upvote if the resource is helpful</span>',
    '.recommenderVoteArrowDown': '<span>Downvote if the resource is not helpful</span>',
    '.recommenderVoteScore': '<span>Votes</span>', // 
    'a': '<span>Resource title</span>', // TODO: I would suggest making the description be the tooltip.
    '.recommender_remove': '<span>Remove this resource and give the reason why you do that</span>',
    '.recommender_previewingImg': '<span>Preview image (typically, a screenshot)</span>',
    '.recommender_inTitle': '<span>Give a short (1-3 sentence) summary of the resource; ideally, this should be concise, but give enough detail to let students know whether this resources is useful to them</span>',
    '.recommender_inUrl': '<span>Cut-and-paste the URL of the resource.</span>',
    '.recommender_inDescriptionText': '<span>Give a paragraph of summary of the resource; the summary should be more detailed than you gave in Title</span>',
    '.addResourceScreenshot': '<span>Upload a preview screenshot (in GIF/PNG/JPG) of the resource; ideally, this should let students know whether this resources is useful to them</span>',
    '.recommender_editTitle': '<span>Give a short (1-3 sentence) summary of the resource; ideally, this should be concise, but give enough detail to let students know whether this resources is useful to them</span>',
    '.recommender_editUrl': '<span>Cut-and-paste the URL of the resource.</span>', // TODO: Give instructions to go to element of learning sequence, or time in video
    '.recommender_editDescriptionText': '<span>Give a paragraph of summary of the resource; the summary should be more detailed than you gave in Title</span>',
    '.editResourceScreenshot': '<span>Upload a preview screenshot (in GIF/PNG/JPG) of the resource; ideally, this should let students know whether this resources is useful to them</span>',
    '.recommender_backToViewButton': '<span>Go back to the main list</span>',
    '.recommender_flagReason': '<span>Give a meaningful reason for why this resource should be removed</span>',
    '.recommender_flagResource': '<span>Flag this resource as problematic and give your reason</span>',
    '.deleteResource': '<span>Delete this resource</span>',
    '.recommender_hideShow': '<span>Show a list of student-recommented related resources</span>',
    '.recommender_hideShow.recommender_resourceListExpanded': '<span>Hide the recommendations list</span>',
    '.recommender_endorse': '<span>Check the icon to endorse this resource</span>',
    '.recommender_endorse.recommender_endorsed': '<span>This resource is endorsed by staff</span>',
    '.recommender_resourceRankingForRemovalButton': '<span>Click to view resources for removal</span>',
    '.recommender_resourceRankingForRemovalButton.recommender_removeMode': '<span>Click to view resources in ordinary decreasing-vote order</span>'
};

var problematicReasonsPrefix = '<br/>Here is a list of reasons why students think this resource problematic: <br/>&nbsp;&nbsp;&nbsp;&nbsp;';
var endorsedReasonsPrefix = '<br/>The reason why it is endorsed is: <br/>&nbsp;&nbsp;&nbsp;&nbsp;';
var recommenderResourceAriaPrefix = 'Resource: ';
var recommenderVoteScorePostfix = ' votes';
var reasonSeparator = '<br/>&nbsp;&nbsp;&nbsp;&nbsp;';

var exportResourceFileInfo = {
    'fileType': 'data:application/json;charset=utf-8,',
    'fileName': 'resource.json'
};

var confirmInterruptSubmission = 'The content you typed has not been submitted yet. Are you sure to go back?';

var headerText = {
    '.recommender_importResourcePage': 'Import resources',
    '.recommender_addResourcePage': 'Suggest resource',
    '.recommender_editResourcePage': 'Edit existing resource',
    '.recommender_flagResourcePage': 'Flag Resource',
    '.recommender_endorsePage': 'Endorse Resource',
    '.recommender_removePage': 'Remove Resource'
};

var modifyPageTitle = {
    '.recommender_importResourcePage': 'Upload resources in JSON format to the database.',
    '.recommender_addResourcePage': 'Suggest a resource which can help other students with this problem. Please do not give the answer directly.',
    '.recommender_editResourcePage': 'Edit the resource and make it more helpful for other students with this problem. Please do not give the answer directly.',
    '.recommender_flagResourcePage': 'Why would you like to flag this resource? The staff will review all flagged resources, and remove inappropriate ones (spam, incorrect, abusive, etc.). Giving a clear reason will help us do this efficiently.',
    '.recommender_endorsePage': 'Endorse this resource and give the reason why you do that.',
    '.recommender_removePage': 'Remove this resource and give the reason why you do that.'
};

var writeDatabaseEnum = {
    ADD: 'add',
    EDIT: 'edit'
};

var voteTypeEnum = {
    UPVOTE: 'upvote',
    DOWNVOTE: 'downvote'
};

var sortResourceEnum = {
    INCREASE: 'increase',
    DECREASE: 'decrease'
};

var voteConfigs = {
    'upvote': {
        'buttonClassName': 'recommenderVoteArrowUp',
        'eventName': 'arrowUp',
        'serverEventName': 'recommender_upvote',
        'voteClassName': 'recommender_upvoting',
        'previousVoteClassName': 'recommender_downvoting'
    },
    'downvote': {
        'buttonClassName': 'recommenderVoteArrowDown',
        'eventName': 'arrowDown',
        'serverEventName': 'recommender_downvote',
        'voteClassName': 'recommender_downvoting',
        'previousVoteClassName': 'recommender_upvoting'
    }
};

var resourceListHeader = {
    'hide': 'Hide related resources',
    'show': 'Show related resources'
}

var ariaLabelText = {
    'upvote': 'upvote',
    'downvote': 'downvote',
    'undoUpvote': 'undo upvote',
    'undoDownvote': 'undo downvote',
    'problematicResource': 'problematic resource',
    'endorsedResource': 'endorsed resource',
    'endorseResource': 'endorse resource',
    'undoEndorseResource': 'undo endorse resource',
    'removeResource': 'remove resource'
}

var toggleVoteFlag = 'toggle';
var endorseFlag = 'reason';
var removeIcon = '<span class="ui-icon ui-icon-gear recommender_remove"></span>';

var loggerStatus = {
    'hideShow': {
        'hide': 'hide',
        'show': 'show'
    },
    'pagination': {
        'moreIcon': 'Click on morePageIcon',
        /**
         * Generate the string for logging the page-change event.
         * @param {string} fromPage The index of the previously shown page.
         * @param {string} toPage The index of the currently shown page.
         * @returns {string} The string for logging the page-change event.
         */
        toPageNIcon: function(fromPage, toPage) { return 'From page ' + fromPage + ' To page ' + toPage; }
    },
    'exportResource': {'exportResource': 'Export resources'},
    'importResource': {
        'attempt': 'Entering import resource mode',
        'complete': 'Import resources'
    },
    'addResource': {
        'attempt': 'Entering add resource mode',
        'complete': 'Add new resource'
    },
    'editResource': {
        'attempt': 'Entering edit resource mode',
        'complete': 'Edit existing resource'
    },
    'flagResource': {
        'attempt': 'Entering flag resource mode',
        'complete': 'Flag resource',
        'unflag': 'Unflag resource'
    },
    'endorseResource': {
        'endorse': 'Endorse resource',
        'unendorse': 'Unendorse resource'
    },
    'removeResource': {'removeResource': 'Remove resource'},
    'hover': {'hover': 'Hovering resource'},
    'clickResource': {'clickResource': 'A resource was clicked'},
    'backToView': {'backToView': 'Back to resource list mode'}
};
