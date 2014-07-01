var tooltipsCats = [
    '.resource_add_button',
    '.resource_edit_button',
    '.recommender_vote_arrow_up',
    '.recommender_vote_arrow_down',
    '.recommender_vote_score',
    '.recommender_blurb',
    '.previewingImg',
    '.in_title',
    '.in_url',
    '.edit_title',
    '.edit_url',
    '.backToViewButton',
    '.flag_reason',
    '.flagResource',
    '.flagResource.problematic',
    '.recommender_row_top',
    '.recommender_row_top.resource_list_expanded'
];

var tooltipsCatsText = {
    '.resource_add_button': 'Recommend a new resource which may be helpful to other students solving this problem',
    '.resource_edit_button': 'Edit this resource',
    '.recommender_vote_arrow_up': 'Upvote if the resource is helpful',
    '.recommender_vote_arrow_down': 'Downvote if the resource is not helpful',
    '.recommender_vote_score': 'Votes', // 
    '.recommender_blurb': 'Resource title', // TODO: I would suggest making the description be the tooltip. 
    '.previewingImg': 'Preview image (typically, a screenshot)',
    '.in_title': 'Give a short (1-3 sentence) summary of the resource; ideally, this should be concise, but give enough detail to let students know whether this resources is useful to them',
    '.in_url': 'Cut-and-paste the URL of the resource.',
    '.edit_title': 'Give a short (1-3 sentence) summary of the resource; ideally, this should be concise, but give enough detail to let students know whether this resources is useful to them',
    '.edit_url': 'Cut-and-paste the URL of the resource.', // TODO: Give instructions to go to element of learning sequence, or time in video
    '.backToViewButton': 'Go back to the main list',
    '.flag_reason': 'Give a meaningful reason for why this resource should be removed',
    '.flagResource': 'Flag this resource as problematic',
    '.flagResource.problematic': 'Unflag this problematic resource or edit the reason for it',
    '.recommender_row_top': 'Show a list of student-recommented related resources',
    '.recommender_row_top.resource_list_expanded': 'Hide the recommendations list'      
};

var staff_edit_buttons = [
	"submit_s3_info",
	'delete_resource'/*,
	"endorse_resource",
	"deendorse_resource"*/
]

var staff_edit_buttons_text = {
	'delete_resource': "Delete resource",
	"endorse_resource": "Endorse resource",
	"deendorse_resource": "De-endorse resource",
	"submit_s3_info": "Submit information for Amazon Web Services S3"
}

var staff_edit_textareas = [
	'aws_access_key',
	'aws_secret_key',
	'bucketName',
	'uploadedFileDir'
]

var staff_edit_textareas_text = {
	'aws_access_key': 'Amazon Web Services access key',
	'aws_secret_key': 'Amazon Web Services secret key',
	'bucketName': 'Bucket name of your Amazon Web Services',
	'uploadedFileDir': 'Directory for your upload files'
}

var staff_edit_textareas_placeholder = {
	'aws_access_key': '',
	'aws_secret_key': '',
	'bucketName': 'danielswli',
	'uploadedFileDir': 'uploads/'
}
