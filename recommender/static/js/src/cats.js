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
	'.resource_add_button': 'Recommend a new helpful resource for this problem with a short description, hyperlink, and previewing screenshot to the new resource',
    '.resource_edit_button': 'Edit the description, hypelink, and previewing screenshot of this resource',
    '.recommender_vote_arrow_up': 'Upvote for a helpful resource',
    '.recommender_vote_arrow_down': 'Downvote for an irrelevant resource',
    '.recommender_vote_score': 'Votes',
    '.recommender_blurb': 'The title of a helpful resource',
    '.previewingImg': 'Previewing screenshot',
    '.in_title': 'Type in the description of the resource',
    '.in_url': 'Type in the hyperlink to the resource',
    '.edit_title': 'Type in the description of the resource',
    '.edit_url': 'Type in the hyperlink to the resource',
    '.backToViewButton': 'Back to list of related resources',
    '.flag_reason': 'Type in the reason why you flag the resource',
    '.flagResource': 'Flag this resource as problematic and give the reason',
    '.flagResource.problematic': 'Unflag this problematic resource or edit the reason for it',
    '.recommender_row_top': 'Select for expanding resource list',
    '.recommender_row_top.resource_list_expanded': 'Select to hide the list'
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