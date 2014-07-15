var tooltipsCatsPerResource = [
    '.resource_edit_button',
    '.recommender_vote_arrow_up',
    '.recommender_vote_arrow_down',
    '.recommender_vote_score',
    'a',
    '.flagResource',
    '.staffEdition'
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
    '.recommender_row_top.resource_list_expanded'
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
    '.staffEdition': 'Add Amazon S3 information for file uploading or delete this resource; these functions are restricted to course staff',
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
    '.aws_access_key': 'Give the access key of your Amazon s3 account',
    '.aws_secret_key': 'Give the secret key of your Amazon s3 account',
    '.bucketName': 'Give the bucket name of your Amazon s3 account',
    '.uploadedFileDir': 'Give the path (relative to root directory) of the directory for storing uploaded files',
    '.delete_resource': 'Delete this resource',
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
	"submit_s3_info": "Add Amazon S3 information for file uploading"
}

var staff_edit_textareas = [
	'aws_access_key',
	'aws_secret_key',
	'bucketName',
	'uploadedFileDir'
]

var staff_edit_textareas_text = {
	'aws_access_key': 'Amazon S3 access key',
	'aws_secret_key': 'Amazon S3 secret key',
	'bucketName': 'Bucket name of your Amazon S3',
	'uploadedFileDir': 'Directory for your uploaded files'
}

var staff_edit_textareas_placeholder = {
	'aws_access_key': '',
	'aws_secret_key': '',
	'bucketName': 'danielswli',
	'uploadedFileDir': 'uploads/'
}
