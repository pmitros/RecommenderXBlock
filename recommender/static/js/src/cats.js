var tooltipsCatsPerResource = [
    '.resourceEditButton',
    '.recommenderVoteArrowUp',
    '.recommenderVoteArrowDown',
    '.recommenderVoteScore',
    'a',
    '.flagResource',
    '.deendorse',
    '.checkIcon.endorsed'
];

var tooltipsCats = [
    '.resourceAddButton',
    '.previewingImg',
    '.inTitle',
    '.inUrl',
    '.inDescriptionText',
    '.addResourceScreenshot',
    '.backToViewButton',
    '.flagReason',
    '.awsAccessKey',
    '.awsSecretKey',
    '.bucketName',
    '.uploadedFileDir',
    '.deleteResource',
    '.hideShow.resourceListExpanded',
    '.resourceRankingForDeendorsementButton.deendorsementMode'
];

var tooltipsEditCats = [
    '.editTitle',
    '.editUrl',
    '.editDescriptionText',
    '.editResourceScreenshot'
];

var tooltipsCatsText = {
    '.resourceAddButton': '<span>Recommend a new resource which may be helpful to other students solving this problem</span>',
    '.resourceEditButton': '<span>Edit this resource</span>',
    '.recommenderVoteArrowUp': '<span>Upvote if the resource is helpful</span>',
    '.recommenderVoteArrowDown': '<span>Downvote if the resource is not helpful</span>',
    '.recommenderVoteScore': '<span>Votes</span>', // 
    'a': '<span>Resource title</span>', // TODO: I would suggest making the description be the tooltip.
    '.deendorse': '<span>Deendorse this resource and give the reason why you do that</span>',
    '.previewingImg': '<span>Preview image (typically, a screenshot)</span>',
    '.inTitle': '<span>Give a short (1-3 sentence) summary of the resource; ideally, this should be concise, but give enough detail to let students know whether this resources is useful to them</span>',
    '.inUrl': '<span>Cut-and-paste the URL of the resource.</span>',
    '.inDescriptionText': '<span>Give a paragraph of summary of the resource; the summary should be more detailed than you gave in Title</span>',
    '.addResourceScreenshot': '<span>Upload a preview screenshot (in GIF/PNG/JPG) of the resource; ideally, this should let students know whether this resources is useful to them</span>',
    '.editTitle': '<span>Give a short (1-3 sentence) summary of the resource; ideally, this should be concise, but give enough detail to let students know whether this resources is useful to them</span>',
    '.editUrl': '<span>Cut-and-paste the URL of the resource.</span>', // TODO: Give instructions to go to element of learning sequence, or time in video
    '.editDescriptionText': '<span>Give a paragraph of summary of the resource; the summary should be more detailed than you gave in Title</span>',
    '.editResourceScreenshot': '<span>Upload a preview screenshot (in GIF/PNG/JPG) of the resource; ideally, this should let students know whether this resources is useful to them</span>',
    '.backToViewButton': '<span>Go back to the main list</span>',
    '.flagReason': '<span>Give a meaningful reason for why this resource should be removed</span>',
    '.flagResource': '<span>Flag this resource as problematic and give your reason</span>',
    '.deleteResource': '<span>Delete this resource</span>',
    '.hideShow': '<span>Show a list of student-recommented related resources</span>',
    '.hideShow.resourceListExpanded': '<span>Hide the recommendations list</span>',
    '.checkIcon': '<span>Check the icon to endorse this resource</span>',
    '.checkIcon.endorsed': '<span>This resource is endorsed by staff</span>',
    '.resourceRankingForDeendorsementButton': '<span>Click to view resources for de-endorsement</span>',
    '.resourceRankingForDeendorsementButton.deendorsementMode': '<span>Click to view resources in ordinary decreasing-vote order</span>'
};

var uploadFileError = [
    'FILE_TYPE_ERROR',
    'IMPROPER_S3_SETUP',
    '{"success": "Submission aborted!',
    'FILE_SIZE_ERROR'
];

var uploadFileErrorText = {
    'FILE_TYPE_ERROR': 'Please upload an image in GIF/JPG/PNG',
    'IMPROPER_S3_SETUP': 'The configuration of Amazon S3 is not properly set',
    '{"success": "Submission aborted!': 'Size of uploaded file exceeds threshold',
    'FILE_SIZE_ERROR': 'Size of uploaded file exceeds threshold'
};

var importResourceError = [
    'NOT_A_STAFF',
    'FILE_FORMAT_ERROR'
];

var importResourceErrorText = {
    'NOT_A_STAFF': 'Only staff can import resources',
    'FILE_FORMAT_ERROR': 'Please submit the JSON file obtained with the download resources button'
};

var problematicReasonsPrefix = '<br/>Here is a list of reasons why students think this resource problematic: <br/>&nbsp;&nbsp;&nbsp;&nbsp;';
var endorsedReasonsPrefix = '<br/>The reason why it is endorsed is: <br/>&nbsp;&nbsp;&nbsp;&nbsp;';
var reasonSeparator = '<br/>&nbsp;&nbsp;&nbsp;&nbsp;';

var exportResourceFileInfo = {
    'fileType': 'data:application/json;charset=utf-8,',
    'fileName': 'resource.json'
};

var confirmInterruptSubmission = 'The content you typed has not been submitted yet. Are you sure to go back?';

var headerText = {
    '.importResourcePage': 'Import resources',
    '.addResourcePage': 'Suggest resource',
    '.editResourcePage': 'Edit existing resource',
    '.flagResourcePage': 'Flag Resource',
    '.endorsePage': 'Endorse Resource',
    '.deendorsePage': 'Deendorse Resource'
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
        'voteClassName': 'upvoting',
        'previousVoteClassName': 'downvoting'
    },
    'downvote': {
        'buttonClassName': 'recommenderVoteArrowDown',
        'eventName': 'arrowDown',
        'serverEventName': 'recommender_downvote',
        'voteClassName': 'downvoting',
        'previousVoteClassName': 'upvoting'
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
    'deendorseResource': 'deendorse resource'
}

var toggleVoteFlag = 'toggle';
var endorseFlag = 'reason';
var deendorseIcon = '<span class="ui-icon ui-icon-gear deendorse"></span>';

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
    'deendorseResource': {'deendorseResource': 'Deendorse resource'},
    'hover': {'hover': 'Hovering resource'},
    'clickResource': {'clickResource': 'A resource was clicked'},
    'backToView': {'backToView': 'Back to resource list mode'}
};
