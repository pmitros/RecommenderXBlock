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
	'.resourceAddButton': 'Recommend a new resource which may be helpful to other students solving this problem',
	'.resourceEditButton': 'Edit this resource',
	'.recommenderVoteArrowUp': 'Upvote if the resource is helpful',
	'.recommenderVoteArrowDown': 'Downvote if the resource is not helpful',
	'.recommenderVoteScore': 'Votes', // 
	'a': 'Resource title', // TODO: I would suggest making the description be the tooltip.
	'.deendorse': 'Deendorse this resource and give the reason why you do that',
	'.previewingImg': 'Preview image (typically, a screenshot)',
	'.inTitle': 'Give a short (1-3 sentence) summary of the resource; ideally, this should be concise, but give enough detail to let students know whether this resources is useful to them',
	'.inUrl': 'Cut-and-paste the URL of the resource.',
	'.inDescriptionText': 'Give a paragraph of summary of the resource; the summary should be more detailed than you gave in Title',
	'.addResourceScreenshot': 'Upload a preview screenshot (in GIF/PNG/JPG) of the resource; ideally, this should let students know whether this resources is useful to them',
	'.editTitle': 'Give a short (1-3 sentence) summary of the resource; ideally, this should be concise, but give enough detail to let students know whether this resources is useful to them',
	'.editUrl': 'Cut-and-paste the URL of the resource.', // TODO: Give instructions to go to element of learning sequence, or time in video
	'.editDescriptionText': 'Give a paragraph of summary of the resource; the summary should be more detailed than you gave in Title',
	'.editResourceScreenshot': 'Upload a preview screenshot (in GIF/PNG/JPG) of the resource; ideally, this should let students know whether this resources is useful to them',
	'.backToViewButton': 'Go back to the main list',
	'.flagReason': 'Give a meaningful reason for why this resource should be removed',
	'.flagResource': 'Flag this resource as problematic and give your reason',
	'.deleteResource': 'Delete this resource',
	'.hideShow': 'Show a list of student-recommented related resources',
	'.hideShow.resourceListExpanded': 'Hide the recommendations list',
	'.checkIcon': 'Check the icon to endorse this resource',
	'.checkIcon.endorsed': 'This resource is endorsed by staff',
	'.resourceRankingForDeendorsementButton': 'Click to view resources for de-endorsement',
	'.resourceRankingForDeendorsementButton.deendorsementMode': 'Click to view resources in ordinary decreasing-vote order'
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

var problematicReasonsPrefix = '<br/>Here is a list of reasons why students think this resource problematic: <br/>&nbsp;&nbsp;&nbsp;&nbsp;'
var endorsedReasonsPrefix = '<br/>The reason why it is endorsed is: <br/>&nbsp;&nbsp;&nbsp;&nbsp;'
var reasonSeparator = '<br/>&nbsp;&nbsp;&nbsp;&nbsp;'
