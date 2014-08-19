var tooltipsCatsPerResource = [
    '.resource_edit_button',
    '.recommender_vote_arrow_up',
    '.recommender_vote_arrow_down',
    '.recommender_vote_score',
    'a',
    '.flagResource',
    '.deendorse',
    '.checkIcon.endorsed'
];

var tooltipsCats = [
    '.resource_add_button',
    '.previewingImg',
    '.in_title',
    '.in_url',
    '.in_descriptionText',
    '.addResourceScreenshot',
    '.backToViewButton',
    '.flag_reason',
    '.aws_access_key',
    '.aws_secret_key',
    '.bucketName',
    '.uploadedFileDir',
    '.delete_resource',
    '.recommender_row_top.resource_list_expanded',
    '.resource_ranking_for_deendorsement_button.deendorsement_mode'
];

var tooltipsEditCats = [
    '.edit_title',
    '.edit_url',
    '.edit_descriptionText',
    '.editResourceScreenshot'
];

var tooltipsCatsText = {
    '.resource_add_button': 'Recommend a new resource which may be helpful to other students solving this problem',
    '.resource_edit_button': 'Edit this resource',
    '.recommender_vote_arrow_up': 'Upvote if the resource is helpful',
    '.recommender_vote_arrow_down': 'Downvote if the resource is not helpful',
    '.recommender_vote_score': 'Votes', // 
    'a': 'Resource title', // TODO: I would suggest making the description be the tooltip.
    '.deendorse': 'Deendorse this resource and give the reason why you do that',
    '.previewingImg': 'Preview image (typically, a screenshot)',
    '.in_title': 'Give a short (1-3 sentence) summary of the resource; ideally, this should be concise, but give enough detail to let students know whether this resources is useful to them',
    '.in_url': 'Cut-and-paste the URL of the resource.',
    '.in_descriptionText': 'Give a paragraph of summary of the resource; the summary should be more detailed than you gave in Title',
    '.addResourceScreenshot': 'Upload a preview screenshot (in GIF/PNG/JPG) of the resource; ideally, this should let students know whether this resources is useful to them',
    '.edit_title': 'Give a short (1-3 sentence) summary of the resource; ideally, this should be concise, but give enough detail to let students know whether this resources is useful to them',
    '.edit_url': 'Cut-and-paste the URL of the resource.', // TODO: Give instructions to go to element of learning sequence, or time in video
    '.edit_descriptionText': 'Give a paragraph of summary of the resource; the summary should be more detailed than you gave in Title',
    '.editResourceScreenshot': 'Upload a preview screenshot (in GIF/PNG/JPG) of the resource; ideally, this should let students know whether this resources is useful to them',
    '.backToViewButton': 'Go back to the main list',
    '.flag_reason': 'Give a meaningful reason for why this resource should be removed',
    '.flagResource': 'Flag this resource as problematic and give your reason',
    '.delete_resource': 'Delete this resource',
    '.recommender_row_top': 'Show a list of student-recommented related resources',
    '.recommender_row_top.resource_list_expanded': 'Hide the recommendations list',
    '.checkIcon': 'Check the icon to endorse this resource',
    '.checkIcon.endorsed': 'This resource is endorsed by staff',
    '.resource_ranking_for_deendorsement_button': 'Click to view resources for de-endorsement',
    '.resource_ranking_for_deendorsement_button.deendorsement_mode': 'Click to view resources in ordinary decreasing-vote order'
};

var uploadFileError = [
    'FILE_TYPE_ERROR',
    'IMPROPER_S3_SETUP',
    '{"success": "Submission aborted!'
];

var uploadFileErrorText = {
    'FILE_TYPE_ERROR': 'Please upload an image in GIF/JPG/PNG',
    'IMPROPER_S3_SETUP': 'The configuration of Amazon S3 is not properly set',
    '{"success": "Submission aborted!': 'Size of uploaded file exceeds threshold'
};

var problematic_ressons_prefix = '<br/>Here is a list of reasons why students think this resource problematic: <br/>&nbsp;&nbsp;&nbsp;&nbsp;'
var endorsed_ressons_prefix = '<br/>The reason why it is endorsed is: <br/>&nbsp;&nbsp;&nbsp;&nbsp;'
var reason_separator = '<br/>&nbsp;&nbsp;&nbsp;&nbsp;'
