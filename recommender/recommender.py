"""TO-DO: Write a description of what this XBlock is."""

import json, string, random, re

import pkg_resources

try:
    from eventtracking import tracker
except:
    class tracker:
        @staticmethod
        def emit(a,b):
            pass

from mako.template import Template
from mako.lookup import TemplateLookup

from xblock.core import XBlock
from xblock.fields import Scope, Integer, String, BlockScope, List
from xblock.fragment import Fragment

from fs.s3fs import S3FS
from webob.response import Response

aws_access_key_env='AKIAIRDHSV6YZJZ4RFGA'
aws_secret_key_env='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'
bucketName='danielswli'
uploadedFileDir = 'uploads/'

class RecommenderXBlock(XBlock):
    """
    This XBlock will show a set of recommended resources provided by students.
    """
    # Scope-wide. List of JSON objects corresponding to recommendations combine XML and user. 
    default_recommendations = List(help="List of help resources", default=[], scope=Scope.content)
    # Scope-wide. List of JSON objects corresponding to recommendations as defined in XML. 
    recommendations = List(help="List of help resources", default=[], scope=Scope.user_state_summary)
    # List of deleted recommendation ID.
    deletedRecommendationIds = List(help="List of help resources", default=[], scope=Scope.user_state_summary)
    # Ids of upvoted resources for this particular user
    upvotedIds = List(help="List of items user gave upvote to", default=[], scope=Scope.user_state)
    # Ids of downvoted resources for this particular user
    downvotedIds = List(help="List of items user gave downvote to", default=[], scope=Scope.user_state)
    # Ids of flagged resource (problematic resource) for this particular user
    flaggedIds = List(help="List of items user flagged to", default=[], scope=Scope.user_state)
    # Reasons of flagged resource (problematic resource) for this particular user
    flaggedReasons = List(help="List of reasons of items user flagged to", default=[], scope=Scope.user_state)
    
    template_lookup = None
    resource_content_fields = ['url', 'title', 'description', 'descriptionText']

    def resource_string(self, path):
        """Handy helper for getting static file resources from our Python package."""
        data = pkg_resources.resource_string(__name__, path)
        return data.decode("utf8")

    def getResourceNewId(self):
        """
        Generate a unique Id for each resource.
        """
        recommendations = self.recommendations
        if not recommendations:
            recommendations = self.default_recommendations
        resourceId = -1
        for recommendation in recommendations:
            if recommendation['id'] > resourceId:
                resourceId = recommendation['id']
        for deletedRecommendationId in self.deletedRecommendationIds:
            if deletedRecommendationId > resourceId:
                resourceId = deletedRecommendationId
        return resourceId + 1

    def getEntryIndex(self, entryId, entryList):
        """
        Get the element index in a list based on its ID.
        """
        for idx in range(0, len(entryList)):
            if entryList[idx]['id'] == entryId:
                return idx
        return -1

    @XBlock.json_handler
    def delete_resource(self, data, suffix=''):
        """
        Delete an entry of resource.
        
        Args:
                data: dict in JSON format
                data['id']: the ID of the resouce to be deleted
        Returns:
                result: dict in JSON format
                result['Success']: the boolean indicator for whether the deletion is complete
                result['error']: the error message generated when the deletion fails
                result[resource_content_field]: the content of the deleted resource
        """
        resourceId = data['id']
        result = {}
        result['id'] = resourceId
        idx = self.getEntryIndex(resourceId, self.recommendations)
        if idx not in range(0, len(self.recommendations)):
            result['error'] = 'bad id';
            tracker.emit('delete_resource', result)
            result['Success'] = False
            return result
        
        result['upvotes'] = self.recommendations[idx]['upvotes']
        result['downvotes'] = self.recommendations[idx]['downvotes']
        for field in self.resource_content_fields:
            result[field] = self.recommendations[idx][field]
        tracker.emit('delete_resource', result)
        self.deletedRecommendationIds.append(resourceId)
        del self.recommendations[idx]
        result['Success'] = True
        return result

    @XBlock.json_handler
    def handle_upvote(self, data, suffix=''):
        """
        Add one vote to an entry of resource.
        
        Args:
                data: dict in JSON format
                data['id']: the ID of the resouce which was upvoted
        Returns:
                result: dict in JSON format
                result['Success']: the boolean indicator for whether the process of this voting action is complete
                result['error']: the error message generated when the process fails
                result['oldVotes']: the original votes
                result['newVotes']: the votes after this action
                result['toggle']: the boolean indicator for whether the resource was switched from downvoted to upvoted
        """
        resourceId = data['id']
        idx = self.getEntryIndex(resourceId, self.recommendations)
        result = {}
        result['id'] = resourceId
        if idx not in range(0, len(self.recommendations)):
            result['error'] = 'bad id';
            tracker.emit('recommender_upvote', result)
            result['Success'] = False
            return result

        result['oldVotes'] = self.recommendations[idx]['upvotes'] - self.recommendations[idx]['downvotes']
        if resourceId in self.upvotedIds:
            del self.upvotedIds[self.upvotedIds.index(resourceId)]
            self.recommendations[idx]['upvotes'] -= 1
            result['newVotes'] = self.recommendations[idx]['upvotes'] - self.recommendations[idx]['downvotes']
            tracker.emit('recommender_upvote', result)
            result['Success'] = True
            return result
    
        if resourceId in self.downvotedIds:
            del self.downvotedIds[self.downvotedIds.index(resourceId)]
            self.recommendations[idx]['downvotes'] -= 1
            result['toggle'] = True
        self.upvotedIds.append(resourceId)
        self.recommendations[idx]['upvotes'] += 1
        result['newVotes'] = self.recommendations[idx]['upvotes'] - self.recommendations[idx]['downvotes']
        tracker.emit('recommender_upvote', result)
        result['Success'] = True
        return result

    @XBlock.json_handler
    def handle_downvote(self, data, suffix=''):
        """
        Subtract one vote from an entry of resource.
        
        Args:
                data: dict in JSON format
                data['id']: the ID of the resouce which was downvoted
        Returns:
                result: dict in JSON format
                result['Success']: the boolean indicator for whether the process of this voting action is complete
                result['error']: the error message generated when the process fails
                result['oldVotes']: the original votes
                result['newVotes']: the votes after this action
                result['toggle']: the boolean indicator for whether the resource was switched from upvoted to downvoted
        """
        resourceId = data['id']
        idx = self.getEntryIndex(resourceId, self.recommendations)
        result = {}
        result['id'] = resourceId
        if idx not in range(0, len(self.recommendations)):
            result['error'] = 'bad id';
            tracker.emit('recommender_downvote', result)
            result['Success'] = False
            return result

        result['oldVotes'] = self.recommendations[idx]['upvotes'] - self.recommendations[idx]['downvotes']
        if resourceId in self.downvotedIds:
            del self.downvotedIds[self.downvotedIds.index(resourceId)]
            self.recommendations[idx]['downvotes'] -= 1
            result['newVotes'] = self.recommendations[idx]['upvotes'] - self.recommendations[idx]['downvotes']
            tracker.emit('recommender_downvote', result)
            result['Success'] = True
            return result
    
        if resourceId in self.upvotedIds:
            del self.upvotedIds[self.upvotedIds.index(resourceId)]
            self.recommendations[idx]['upvotes'] -= 1
            result['toggle'] = True
        self.downvotedIds.append(resourceId)
        self.recommendations[idx]['downvotes'] += 1
        result['newVotes'] = self.recommendations[idx]['upvotes'] - self.recommendations[idx]['downvotes']
        tracker.emit('recommender_downvote', result)
        result['Success'] = True
        return result

    @XBlock.handler
    def upload_screenshot(self, request, suffix=''):
        """
        Upload a screenshot for an entry of resource as a preview, to S3.
        
        Args:
                request: HTTP POST request
                request.POST['file'].file: the file to be uploaded
        Returns:
                response: HTTP response
                response.body (response.responseText): name of the uploaded file
        Env variables:
                aws_access_key_env: s3 access key
                aws_secret_key_env: s3 secret key
                bucket: name of the s3 bucket
        """
        chars=string.ascii_uppercase + string.digits
        fileNameLength=11

        fileType = ''
        allowedTypes = ['.png', '.jpg', '.gif']
        for allowedType in allowedTypes:
            if str(request.POST['file'].file).endswith(allowedType):
                fileType = allowedType
        if fileType == '':
            tracker.emit('upload_screenshot', {'uploadedFileName': 'FILETYPEERROR'})
            response = Response()
            response.body = 'FILETYPEERROR'
            response.headers['Content-Type'] = 'text/plain'
            return response
    
        S3FS_handler = S3FS(bucketName, aws_access_key=aws_access_key_env, aws_secret_key=aws_secret_key_env)
        while True:
            fileId = ''.join(random.choice(chars) for _ in range(fileNameLength))
            fileName = uploadedFileDir + fileId + fileType
            if not S3FS_handler.exists(fileName):
                break
        content = request.POST['file'].file.read()
        fhwrite = S3FS_handler.open(fileName, 'wb')
        fhwrite.write(content)
        fhwrite.close()
        S3FS_handler.makepublic(fileName)

        response = Response()
        response.body = fileName
        response.headers['Content-Type'] = 'text/plain'
        tracker.emit('upload_screenshot', {'uploadedFileName': fileName})
        return response

    @XBlock.json_handler
    def add_resource(self, data, suffix=''):
        """
        Add an entry of new resource.
        
        Args:
                data: dict in JSON format
                data[resource_content_field]: the content of the resource to be added
        Returns:
                result: dict in JSON format
                result['Success']: the boolean indicator for whether the addition is complete
                result['error']: the error message generated when the addition fails
                result[resource_content_field]: the content of the added resource
        """
        # Construct new resource
        result = {}
        for field in self.resource_content_fields:
            result[field] = data[field]

        # check url for redundancy
        for recommendation in self.recommendations:
            if recommendation['url'] == data['url']:
                result['error'] = 'redundant resource'
                tracker.emit('add_resource', result)
                result['Success'] = False
                return result

        result['id'] = self.getResourceNewId()
        tracker.emit('add_resource', result)

        result['upvotes'] = 0
        result['downvotes'] = 0
        self.recommendations.append(dict(result))
        result['Success'] = True
        return result

    @XBlock.json_handler
    def edit_resource(self, data, suffix=''):
        """
        Edit an entry of existing resource.
        
        Args:
                data: dict in JSON format
                data['id']: the ID of the edited resouce
                data[resource_content_field]: the content of the resource to be edited
        Returns:
                result: dict in JSON format
                result['Success']: the boolean indicator for whether the edit is complete
                result['error']: the error message generated when the edit fails
                result[old_resource_content_field]: the content of the resource before edited
                result[resource_content_field]: the content of the resource after edited
        """
        resourceId = data['id']
        result = {}
        result['id'] = resourceId
        idx = self.getEntryIndex(resourceId, self.recommendations)
        if idx not in range(0, len(self.recommendations)):
            result['error'] = 'bad id';
            tracker.emit('edit_resource', result)
            result['Success'] = False
            return result

        for field in self.resource_content_fields:
            result['old_' + field] = self.recommendations[idx][field]
            result[field] = data[field]
        # check url for redundancy
        if self.recommendations[idx]['url'] != data['url']:
            for recommendation in self.recommendations:
                if recommendation['url'] == data['url']:
                    result['error'] = 'existing url'
                    for field in self.resource_content_fields:
                        result['dup_' + field] = self.recommendations[self.recommendations.index(recommendation)][field]
                    result['dup_id'] = self.recommendations[self.recommendations.index(recommendation)]['id']
                    tracker.emit('edit_resource', result)
                    result['Success'] = False
                    return result

        for field in data:
            if field == 'id':
                continue
            if data[field] == "":
                continue
            self.recommendations[idx][field] = data[field]
        tracker.emit('edit_resource', result)
        result['Success'] = True
        return result

    @XBlock.json_handler
    def flag_resource(self, data, suffix=''):
        """
        Flag (or unflag) an entry of problematic resource and give the reason.
        
        Args:
                data: dict in JSON format
                data['id']: the ID of the problematic resouce
                data['isProblematic']: the boolean indicator for whether the resource is problematic
                data['reason']: the reason why the user believes the resource is problematic
        Returns:
                result: dict in JSON format
                result['Success']: the boolean indicator for whether the edit is complete
                result['reason']: the new reason
                result['oldReason']: the old reason
                result['id']: the ID of the problematic resouce
                result['isProblematic']: the boolean indicator for whether the resource is problematic
        """
        result = {}
        result['id'] = data['id']
        result['isProblematic'] = data['isProblematic']
        result['reason'] = data['reason']
        if data['isProblematic'] == True:
            if data['id'] in self.flaggedIds:
                result['oldReason'] = self.flaggedReasons[self.flaggedIds.index(data['id'])]
                self.flaggedReasons[self.flaggedIds.index(data['id'])] = data['reason']
            else:
                self.flaggedIds.append(data['id'])
                self.flaggedReasons.append(data['reason'])
        else:
            if data['id'] in self.flaggedIds:
                result['oldReason'] = self.flaggedReasons[self.flaggedIds.index(data['id'])]
                result['reason'] = ''
                idx = self.flaggedIds.index(data['id'])
                del self.flaggedIds[idx]
                del self.flaggedReasons[idx]
        tracker.emit('flag_resource', result)
        result['Success'] = True
        return result

    @XBlock.json_handler
    def is_user_staff(self, data, suffix=''):
        """
        Return whether the user is staff.
        
        Returns:
                is_user_staff: indicator for whether the user is staff 
        """
        return {'is_user_staff': self.xmodule_runtime.user_is_staff}

    # TO-DO: change this view to display your data your own way.
    def student_view(self, context=None):
        """
        The primary view of the RecommenderXBlock, shown to students
        when viewing courses.
        """

        if not self.recommendations:
            self.recommendations = self.default_recommendations
        if not self.recommendations:
            self.recommendations = []

        if not self.template_lookup:
            self.template_lookup = TemplateLookup() 
            self.template_lookup.put_string("recommender.html", self.resource_string("static/html/recommender.html"))
            self.template_lookup.put_string("resourcebox.html", self.resource_string("static/html/resourcebox.html"))

        # Ideally, we'd estimate score based on votes, such that items with 1 vote have a sensible ranking (rather than a perfect rating)
        # 
        resources = [{'id' : r['id'], 'title' : r['title'], "votes" : r['upvotes'] - r['downvotes'], 'url' : r['url'], 'description' : r['description'], 'descriptionText' : r['descriptionText']} for r in self.recommendations]
        resources = sorted(resources, key = lambda r: r['votes'], reverse=True)

        frag = Fragment(self.template_lookup.get_template("recommender.html").render(resources = resources, upvotedIds = self.upvotedIds, downvotedIds = self.downvotedIds, flaggedIds = self.flaggedIds, flaggedReasons = self.flaggedReasons))
        frag.add_css_url("//ajax.googleapis.com/ajax/libs/jqueryui/1.10.4/themes/smoothness/jquery-ui.css")
        frag.add_javascript_url("//ajax.googleapis.com/ajax/libs/jqueryui/1.10.4/jquery-ui.min.js")
        frag.add_css(self.resource_string("static/css/recommender.css"))
        frag.add_javascript(self.resource_string("static/js/src/cats.js"))
        frag.add_javascript(self.resource_string("static/js/src/recommender.js"))
        frag.initialize_js('RecommenderXBlock')
        return frag

    # TO-DO: change this to create the scenarios you'd like to see in the
    # workbench while developing your XBlock.
    @staticmethod
    def workbench_scenarios():
        """A canned scenario for display in the workbench."""
        return [
            ("RecommenderXBlock",
             """<vertical_demo>
               <html_demo><img class="question" src="http://people.csail.mit.edu/swli/edx/recommendation/img/pset.png"></img></html_demo> 
               <recommender> 
                     {"id": 1, "title": "Covalent bonding and periodic trends", "upvotes" : 15, "downvotes" : 5, "url" : "https://courses.edx.org/courses/MITx/3.091X/2013_Fall/courseware/SP13_Week_4/SP13_Periodic_Trends_and_Bonding/", "description" : "http://people.csail.mit.edu/swli/edx/recommendation/img/videopage1.png", "descriptionText" : "short description for Covalent bonding and periodic trends"}
                     {"id": 2, "title": "Polar covalent bonds and electronegativity", "upvotes" : 10, "downvotes" : 7, "url" : "https://courses.edx.org/courses/MITx/3.091X/2013_Fall/courseware/SP13_Week_4/SP13_Covalent_Bonding/", "description" : "http://people.csail.mit.edu/swli/edx/recommendation/img/videopage2.png", "descriptionText" : "short description for Polar covalent bonds and electronegativity"}
                     {"id": 3, "title": "Longest wavelength able to to break a C-C bond ...", "upvotes" : 1230, "downvotes" : 7, "url" : "https://answers.yahoo.com/question/index?qid=20081112142253AA1kQN1", "description" : "http://people.csail.mit.edu/swli/edx/recommendation/img/dispage1.png", "descriptionText" : "short description for Longest wavelength able to to break a C-C bond ..."}
                     {"id": 4, "title": "Calculate the maximum wavelength of light for ...", "upvotes" : 10, "downvotes" : 3457, "url" : "https://answers.yahoo.com/question/index?qid=20100110115715AA6toHw", "description" : "http://people.csail.mit.edu/swli/edx/recommendation/img/dispage2.png", "descriptionText" : "short description for Calculate the maximum wavelength of light for ..."}
                     {"id": 5, "title": "Covalent bond - wave mechanical concept", "upvotes" : 10, "downvotes" : 7, "url" : "http://people.csail.mit.edu/swli/edx/recommendation/img/textbookpage1.png", "description" : "http://people.csail.mit.edu/swli/edx/recommendation/img/textbookpage1.png", "descriptionText" : "short description for Covalent bond - wave mechanical concept"}
                     {"id": 6, "title": "Covalent bond - Energetics of covalent bond", "upvotes" : 10, "downvotes" : 7, "url" : "http://people.csail.mit.edu/swli/edx/recommendation/img/textbookpage2.png", "description" : "http://people.csail.mit.edu/swli/edx/recommendation/img/textbookpage2.png", "descriptionText" : "short description for Covalent bond - Energetics of covalent bond"}
                  </recommender>
                </vertical_demo>
             """),
        ]

    @classmethod
    def parse_xml(cls, node, runtime, keys, id_generator):
        """
        Parse the XML for an HTML block.

        The entire subtree under `node` is re-serialized, and set as the
        content of the XBlock.

        """
        block = runtime.construct_xblock_from_class(cls, keys)
        lines = []
        for line in node.text.split('\n'):
            line = line.strip()
            if len(line) > 2:
                lines.append(json.loads(line))
    
        block.default_recommendations = lines
        return block
