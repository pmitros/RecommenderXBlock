"""
This XBlock will show a set of recommended resources which may be helpful to
students solving a given problem.
"""
import json
import hashlib
import pkg_resources
from copy import deepcopy


# TODO: Should be updated once XBlocks and tracking logs have finalized APIs
# and documentation.
try:
    from eventtracking import tracker
except ImportError:
    class tracker:
        """ Define tracker if eventtracking cannot be imported """
        def __init__(self):
            """ Do nothing """
            pass

        @staticmethod
        def emit(param1, param2):
            """ Define emit method if eventtracking cannot be imported """
            pass

from mako.lookup import TemplateLookup

from xblock.core import XBlock
from xblock.fields import Scope, List, Dict
from xblock.fragment import Fragment
from xblock.reference.plugins import Filesystem

from webob.response import Response

@XBlock.needs('fs')
class RecommenderXBlock(XBlock):
    """
    This XBlock will show a set of recommended resources which may be helpful
    to students solving a given problem. The resources are provided and edited
    by students; they can also vote for useful resources and flag problematic
    ones.
    """
    default_recommendations = List(
        help="List of default help resources", default=[], scope=Scope.content
    )
    # A list of default recommenations, it is a JSON object across all users,
    #    all runs of a course, for this xblock.
    # Usage: default_recommendations[index] = {
    #    "id": (Integer) id of a resource,
    #    "title": (String) title of a resource; a 1-3 sentence summary
    #            of a resource
    #    "upvotes" : (Integer) number of upvotes,
    #    "downvotes" : (Integer) number of downvotes,
    #    "url" : (String) the url of a resource,
    #    "description" : (String) the url of a resource's screenshot,
    #    "descriptionText" : (String) a paragraph of
    #            description/summary of a resource }

    recommendations = List(
        help="List of help resources", default=[], scope=Scope.user_state_summary
    )
    # A list of recommenations provided by students, it is a JSON object
    #    aggregated across many users of a single block.
    # Usage: the same as default_recommendations

    deendorsed_recommendations = List(
        help="List of deendorsed resources", default=[], scope=Scope.user_state_summary
    )
    # A list of recommendations deendorsed by course staff, it is a JSON object
    #    aggregated across many users of a single block.
    # Usage: the same as default_recommendations plus 
    #    deendorsed_recommendations[index]['reason'] = (String) the reason why
    #            course staff deendorse this resource

    endorsed_recommendation_ids = List(
        help="List of endorsed resources' ID", default=[], scope=Scope.user_state_summary
    )
    # A list of endorsed recommendations' ids, it is a JSON object aggregated
    #    across many users of a single block.
    # Usage: endorsed_recommendation_ids[index] = (Integer) id of a
    #    endorsed resource
    
    endorsed_recommendation_reasons = List(
        help="List of reasons why the resources are endorsed", default=[], scope=Scope.user_state_summary
    )
    # A list of reasons why the resources are endorsed, it is a JSON object
    #    aggregated across many users of a single block.
    # Usage: endorsed_recommendation_reasons[index] = (String) the reason
    #    why the resource (id = endorsed_recommendation_ids[index]) is endorsed

    flagged_accum_resources = Dict(
        help="Dict of problematic resources which are flagged by users", default={}, scope=Scope.user_state_summary
    )
    # A dict of problematic recommendations which are flagged by users;
    #    it is a JSON object aggregated across many users of a single block.
    # Usage: flagged_accum_resources[userId] = {
    #    "problematic resource id": (String) reason why the resource is
    #            flagged as problematic by that user }

    upvoted_ids = List(
        help="List of resources' ids which user upvoted to", default=[], scope=Scope.user_state
    )
    # A list of recommendations' ids which user upvoted to; it is a JSON
    #    object for one user, for one block, and for one run of a course.
    # Usage: upvoted_ids[index] = (Integer) id of a resource which was
    #    upvoted by the current user

    downvoted_ids = List(
        help="List of resources' ids which user downvoted to", default=[], scope=Scope.user_state
    )
    # A list of recommendations' ids which user downvoted to; it is a JSON
    #    object for one user, for one block, and for one run of a course.
    # Usage: downvoted_ids[index] = (Integer) id of a resource which was
    #    downvoted by the current user

    flagged_ids = List(help="List of problematic resources' ids which user " +
                       "flagged to", default=[], scope=Scope.user_state)
    # A list of problematic recommendations' ids which user flagged to; it is
    #    a JSON object for one user, for one block, and for one run of a
    #    course.
    # Usage: flagged_ids[index] = (Integer) id of a problematic resource which
    #    was flagged by the current user

    flagged_reasons = List(
        help="List of reasons why the corresponding resources were flagged by user as problematic",
        default=[],
        scope=Scope.user_state
    )
    # A list of reasons why the corresponding resources were flagged by user as
    #    problematic; it is a JSON object for one user, for one block, and for
    #    one run of a course.
    # Usage: flagged_reasons[index] = (String) reason why the resource
    #   'flagged_ids[index]' was flagged by the current user as problematic

    fs = Filesystem(help="File system", scope=Scope.user_state_summary)
    # The file system we used to store uploaded screenshot
    
    template_lookup = None

    resource_content_fields = [
        'url', 'title', 'description', 'descriptionText'
    ]
    # the dictionary keys for storing the content of a recommendation

    def get_user_is_staff(self):
        """
        Return self.xmodule_runtime.user_is_staff
        This is not a supported part of the XBlocks API. User data is still
        being defined. However, It's the only way to get the data right now.
        TODO: Should be proper handled in future
        """
        return self.xmodule_runtime.user_is_staff
    
    def get_user_id(self):
        """
        Return the user id.
        This is not a supported part of the XBlocks API. User data is still
        being defined. However, It's the only way to get the data right now.
        TODO: Should be proper handled in future
        """
        return self.xmodule_runtime.anonymous_student_id

    def resource_string(self, path):
        """
        Handy helper for getting static file resources from our Python package.
        """
        data = pkg_resources.resource_string(__name__, path)
        return data.decode("utf8")

    def get_resource_new_id(self):
        """
        Generate a unique Id for each resource.
        Return first unused counting number for new ID
        """
        recommendations = self.recommendations
        if not recommendations:
            recommendations = self.default_recommendations
        resource_id = -1
        for recommendation in recommendations:
            if recommendation['id'] > resource_id:
                resource_id = recommendation['id']
        for deendorsed_recommendation in self.deendorsed_recommendations:
            if deendorsed_recommendation['id'] > resource_id:
                resource_id = deendorsed_recommendation['id']
        return resource_id + 1

    def get_entry_index(self, entry_id, entry_list):
        """
        Get the element index in a list based on its ID.
        """
        for idx in range(0, len(entry_list)):
            if entry_list[idx]['id'] == entry_id:
                return idx
        return -1

    def check_redundancy(self, url1, url2):
        """
        Check redundant resource by comparing the url.
        This is not designed for security, just to check common errors/use-cases
        """
        return (url1.split('#')[0].split('%23')[0] ==
                url2.split('#')[0].split('%23')[0])

    def md5_check_sum(self, data):
        """
        Generate the MD5 hash of file
        Args:
                data: the content of the file (e.g., open(filePath, 'rb').read())
        Returns:
                The MD5 hash
        """
        md5 = hashlib.md5()
        md5.update(data)
        return md5.hexdigest()
    
    def get_onetime_url(self, filename):
        """
        Return one time url for uploaded screenshot
        """
        if filename.startswith('fs://'):
            return str(self.fs.get_url(filename.replace('fs://', ''), 1000*60*60*10))
        else:
            return filename
    
    def error_handler(self, error_msg, event, resource_id=None):
        """
        Generate returned dictionary and log when error comes out
        """
        result = {'error': error_msg, 'Success': False}
        if resource_id is not None:
            result['id'] = resource_id
        tracker.emit(event, result)
        return result

    @XBlock.json_handler
    def handle_upvote(self, data, _suffix=''):
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
        resource_id = data['id']
        idx = self.get_entry_index(resource_id, self.recommendations)
        if idx not in range(0, len(self.recommendations)):
            msg = 'The selected resource is not existing'
            return self.error_handler(msg, 'recommender_upvote', resource_id)

        result = {}
        result['id'] = resource_id
        result['oldVotes'] = (self.recommendations[idx]['upvotes'] -
                              self.recommendations[idx]['downvotes'])
        if resource_id in self.upvoted_ids:
            del self.upvoted_ids[self.upvoted_ids.index(resource_id)]
            self.recommendations[idx]['upvotes'] -= 1
            result['newVotes'] = (self.recommendations[idx]['upvotes'] -
                                  self.recommendations[idx]['downvotes'])
            result['Success'] = True
            tracker.emit('recommender_upvote', result)
            return result

        if resource_id in self.downvoted_ids:
            del self.downvoted_ids[self.downvoted_ids.index(resource_id)]
            self.recommendations[idx]['downvotes'] -= 1
            result['toggle'] = True
        self.upvoted_ids.append(resource_id)
        self.recommendations[idx]['upvotes'] += 1
        result['newVotes'] = (self.recommendations[idx]['upvotes'] -
                              self.recommendations[idx]['downvotes'])
        result['Success'] = True
        tracker.emit('recommender_upvote', result)
        return result

    @XBlock.json_handler
    def handle_downvote(self, data, _suffix=''):
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
        resource_id = data['id']
        idx = self.get_entry_index(resource_id, self.recommendations)
        if idx not in range(0, len(self.recommendations)):
            msg = 'The selected resource is not existing'
            return self.error_handler(msg, 'recommender_downvote', resource_id)

        result = {}
        result['id'] = resource_id
        result['oldVotes'] = (self.recommendations[idx]['upvotes'] -
                              self.recommendations[idx]['downvotes'])
        if resource_id in self.downvoted_ids:
            del self.downvoted_ids[self.downvoted_ids.index(resource_id)]
            self.recommendations[idx]['downvotes'] -= 1
            result['newVotes'] = (self.recommendations[idx]['upvotes'] -
                                  self.recommendations[idx]['downvotes'])
            result['Success'] = True
            tracker.emit('recommender_downvote', result)
            return result

        if resource_id in self.upvoted_ids:
            del self.upvoted_ids[self.upvoted_ids.index(resource_id)]
            self.recommendations[idx]['upvotes'] -= 1
            result['toggle'] = True
        self.downvoted_ids.append(resource_id)
        self.recommendations[idx]['downvotes'] += 1
        result['newVotes'] = (self.recommendations[idx]['upvotes'] -
                              self.recommendations[idx]['downvotes'])
        result['Success'] = True
        tracker.emit('recommender_downvote', result)
        return result

    @XBlock.handler
    def upload_screenshot(self, request, _suffix=''):
        """
        Upload a screenshot for an entry of resource as a preview, to S3.

        Args:
                request: HTTP POST request
                request.POST['file'].file: the file to be uploaded
        Returns:
                response: HTTP response
                response.body (response.responseText): name of the uploaded file
        Env variables:
                aws_access_key: s3 access key
                aws_secret_key: s3 secret key
                bucket: name of the s3 bucket
        """
        # Check invalid file types
        image_types = {
            'jpeg': {
                'extension': [".jpeg", ".jpg"],
                'mimetypes': ['image/jpeg', 'image/pjpeg'],
                'magic': ["ffd8"]
            },
            'png': {
                'extension': [".png"],
                'mimetypes': ['image/png'],
                'magic': ["89504e470d0a1a0a"]
            },
            'gif': {
                'extension': [".gif"],
                'mimetypes': ['image/gif'],
                'magic': ["474946383961", "474946383761"]
            }
        }
        file_type_error = False
        file_type = [ft for ft in image_types
                     if any(str(request.POST['file'].file).lower().endswith(ext)
                            for ext in image_types[ft]['extension'])]

        # Check extension
        if not file_type:
            file_type_error = True
        else:
            file_type = file_type[0]
            # Check mimetypes
            if request.POST['file'].file.content_type not in image_types[file_type]['mimetypes']:
                file_type_error = True
            else:
                # Check magic number
                headers = image_types[file_type]['magic']
                if request.POST['file'].file.read(len(headers[0]) / 2).encode('hex') not in headers:
                    file_type_error = True
                request.POST['file'].file.seek(0)

        if file_type_error:
            response = Response()
            response.body = 'FILE_TYPE_ERROR'
            response.headers['Content-Type'] = 'text/plain'
            tracker.emit('upload_screenshot',
                         {'uploadedFileName': response.body})
            return response

        # Check whether file size exceeds threshold (30MB)
        if request.POST['file'].file.size > 31457280:
            response = Response()
            response.body = 'FILE_SIZE_ERROR'
            response.headers['Content-Type'] = 'text/plain'
            tracker.emit('upload_screenshot',
                         {'uploadedFileName': response.body})
            return response
        
        try:
            content = request.POST['file'].file.read()
            file_id = self.md5_check_sum(content)
            file_name = (file_id + '.' + file_type)

            fhwrite = self.fs.open(file_name, "wb")
            fhwrite.write(content)
            fhwrite.close()
        except BaseException:
            response = Response()
            response.body = 'IMPROPER_S3_SETUP'
            response.headers['Content-Type'] = 'text/plain'
            tracker.emit('upload_screenshot',
                         {'uploadedFileName': response.body})
            return response

        response = Response()
        #response.body = str(self.fs.get_url(file_name))
        response.body = str("fs://" + file_name)
        response.headers['Content-Type'] = 'text/plain'
        tracker.emit('upload_screenshot',
                     {'uploadedFileName': response.body})
        return response

    @XBlock.json_handler
    def add_resource(self, data, _suffix=''):
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
            if self.check_redundancy(recommendation['url'], data['url']):
                result['error'] = ('The resource you are attempting to ' +
                                   'provide has already existed')
                for field in self.resource_content_fields:
                    result['dup_' + field] = recommendation[field]
                result['dup_id'] = recommendation['id']
                result['Success'] = False
                tracker.emit('add_resource', result)
                return result
            
        # check url for de-endorsed resources
        for deendorsed_resource in self.deendorsed_recommendations:
            if self.check_redundancy(deendorsed_resource['url'], data['url']):
                result['error'] = ('The resource you are attempting to ' +
                                   'provide has been de-endorsed by staff, ' +
                                   'because: ' + deendorsed_resource['reason'])
                for field in self.resource_content_fields:
                    result['dup_' + field] = recommendation[field]
                result['dup_id'] = recommendation['id']
                result['Success'] = False
                tracker.emit('add_resource', result)
                return result

        result['id'] = self.get_resource_new_id()

        result['upvotes'] = 0
        result['downvotes'] = 0
        self.recommendations.append(dict(result))
        result['Success'] = True
        tracker.emit('add_resource', result)
        result["description"] = self.get_onetime_url(result["description"])
        return result

    @XBlock.json_handler
    def edit_resource(self, data, _suffix=''):
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
        resource_id = data['id']
        idx = self.get_entry_index(resource_id, self.recommendations)
        if idx not in range(0, len(self.recommendations)):
            msg = 'The selected resource is not existing'
            return self.error_handler(msg, 'edit_resource', resource_id)

        result = {}
        result['id'] = resource_id
        for field in self.resource_content_fields:
            result['old_' + field] = self.recommendations[idx][field]
            if data[field] == "":
                result[field] = self.recommendations[idx][field]
            else:
                result[field] = data[field]

        if not(self.check_redundancy(self.recommendations[idx]['url'],
                                     data['url'])):
            # check url for redundancy
            for recommendation in self.recommendations:
                if self.check_redundancy(recommendation['url'], data['url']):
                    result['error'] = ('The resource you are attempting to ' +
                                       'provide has already existed')
                    for field in self.resource_content_fields:
                        result['dup_' + field] = recommendation[field]
                    result['dup_id'] = recommendation['id']
                    result['Success'] = False
                    tracker.emit('edit_resource', result)
                    return result
                
            # check url for de-endorsed resources
            for deendorsed_resource in self.deendorsed_recommendations:
                if self.check_redundancy(deendorsed_resource['url'], data['url']):
                    result['error'] = ('The resource you are attempting to ' +
                                       'provide has been de-endorsed by ' +
                                       'staff, because: ' +
                                       deendorsed_resource['reason'])
                    for field in self.resource_content_fields:
                        result['dup_' + field] = recommendation[field]
                    result['dup_id'] = recommendation['id']
                    result['Success'] = False
                    tracker.emit('edit_resource', result)
                    return result

        for field in data:
            if field == 'id':
                continue
            if data[field] == "":
                continue
            self.recommendations[idx][field] = data[field]
        result['Success'] = True
        tracker.emit('edit_resource', result)
        result["description"] = self.get_onetime_url(result["description"])
        return result

    @XBlock.json_handler
    def flag_resource(self, data, _suffix=''):
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
        
        user_id = self.get_user_id()
        
        if data['isProblematic']:
            if data['id'] in self.flagged_ids:
                result['oldReason'] = self.flagged_reasons[
                    self.flagged_ids.index(data['id'])]
                self.flagged_reasons[
                    self.flagged_ids.index(data['id'])] = data['reason']
            else:
                self.flagged_ids.append(data['id'])
                self.flagged_reasons.append(data['reason'])
                
                if user_id not in self.flagged_accum_resources:
                    self.flagged_accum_resources[user_id] = {}
            # I don't know why the reason won't be saved if I only use data['id'] as the key
            self.flagged_accum_resources[user_id][str(data['id'])] = data['reason']
        else:
            if data['id'] in self.flagged_ids:
                result['oldReason'] = self.flagged_reasons[
                    self.flagged_ids.index(data['id'])]
                result['reason'] = ''
                idx = self.flagged_ids.index(data['id'])
                del self.flagged_ids[idx]
                del self.flagged_reasons[idx]

                del self.flagged_accum_resources[user_id][str(data['id'])]
        result['Success'] = True
        tracker.emit('flag_resource', result)
        return result

    @XBlock.json_handler
    def is_user_staff(self, _data, _suffix=''):
        """
        Return whether the user is staff.

        Returns:
                is_user_staff: indicator for whether the user is staff
        """
        result = {'is_user_staff': self.get_user_is_staff()}
        tracker.emit('is_user_staff', result)
        return result

    @XBlock.json_handler
    def endorse_resource(self, data, _suffix=''):
        """
        Endorse an entry of resource.

        Args:
                data: dict in JSON format
                data['id']: the ID of the resouce to be endorsed
        Returns:
                result: dict in JSON format
                result['Success']: the boolean indicator for whether the endorsement is complete
                result['error']: the error message generated when the endorsement fails
                result['id']: the ID of the resouce to be endorsed
                result['status']: endorse the resource or undo it
        """
        if not self.get_user_is_staff():
            msg = 'Endorse resource without permission'
            return self.error_handler(msg, 'endorse_resource')
        resource_id = data['id']
        idx = self.get_entry_index(resource_id, self.recommendations)
        if idx not in range(0, len(self.recommendations)):
            msg = 'The selected resource is not existing'
            return self.error_handler(msg, 'endorse_resource', resource_id)
        
        result = {}
        result['id'] = resource_id
        if resource_id in self.endorsed_recommendation_ids:
            result['status'] = 'undo endorsement'
            endorsed_index = self.endorsed_recommendation_ids.index(resource_id)
            del self.endorsed_recommendation_ids[endorsed_index]
            del self.endorsed_recommendation_reasons[endorsed_index]
        else:
            result['reason'] = data['reason']
            result['status'] = 'endorsement'
            self.endorsed_recommendation_ids.append(resource_id)
            self.endorsed_recommendation_reasons.append(data['reason'])

        result['Success'] = True
        tracker.emit('endorse_resource', result)
        return result

    @XBlock.json_handler
    def deendorse_resource(self, data, _suffix=''):
        """
        Deendorse an entry of resource.

        Args:
                data: dict in JSON format
                data['id']: the ID of the resouce to be deendorsed
                data['reason']: the reason why the resouce was deendorsed
        Returns:
                result: dict in JSON format
                result['Success']: the boolean indicator for whether the deendorsement is complete
                result['error']: the error message generated when the deendorsement fails
                result['recommendation']: (Dict) the deendorsed resource
                result['recommendation']['reason']: the reason why the resouce was deendorsed
        """
        # TODO: this function was named delete_resource previously, which should be changed in test_recommender
        if not self.get_user_is_staff():
            msg = 'Deendorse resource without permission'
            return self.error_handler(msg, 'deendorse_resource')
        resource_id = data['id']
        idx = self.get_entry_index(resource_id, self.recommendations)
        if idx not in range(0, len(self.recommendations)):
            msg = 'The selected resource is not existing'
            return self.error_handler(msg, 'deendorse_resource', resource_id)

        result = {}
        result['id'] = resource_id
        deendorsed_resource = deepcopy(self.recommendations[idx])
        del self.recommendations[idx]

        deendorsed_resource['reason'] = data['reason']
        self.deendorsed_recommendations.append(deendorsed_resource)
        result['Success'] = True
        result['recommendation'] = deendorsed_resource
        tracker.emit('deendorse_resource', result)
        return result

    @XBlock.json_handler
    def get_accum_flagged_resource(self, _data, _suffix=''):
        if not self.get_user_is_staff():
            msg = 'Get accumulated flagged resource without permission'
            return self.error_handler(msg, 'get_accum_flagged_resource')
        result = {
            'Success': True,
            'flagged_resources': {}
        }
        for _, flagged_accum_resource_map in self.flagged_accum_resources.iteritems():
            for resource_id in flagged_accum_resource_map:
                if self.get_entry_index(int(resource_id), self.deendorsed_recommendations) != -1:
                    continue
                if resource_id not in result['flagged_resources']:
                    result['flagged_resources'][resource_id] = []
                if flagged_accum_resource_map[resource_id] != '':
                    result['flagged_resources'][resource_id].append(flagged_accum_resource_map[resource_id])
                print result
        tracker.emit('get_accum_flagged_resource', result)
        return result

    def student_view(self, _context=None):
        """
        The primary view of the RecommenderXBlock, shown to students
        when viewing courses.
        """

        if not self.recommendations:
            self.recommendations = self.default_recommendations
        if not self.recommendations:
            self.recommendations = []

        # Transition between two versions. In the previous version, there is
        # no endorsed_recommendation_reasons. Thus, we add empty reasons to
        # make the length of the two lists equal
        while len(self.endorsed_recommendation_ids) > len(self.endorsed_recommendation_reasons):
            self.endorsed_recommendation_reasons.append('')

        if not self.template_lookup:
            self.template_lookup = TemplateLookup()
            self.template_lookup.put_string(
                "recommender.html",
                self.resource_string("static/html/recommender.html"))
            self.template_lookup.put_string(
                "resourcebox.html",
                self.resource_string("static/html/resourcebox.html"))

        # Ideally, we'd estimate score based on votes, such that items with
        # 1 vote have a sensible ranking (rather than a perfect rating)
        resources = [{'id': r['id'],
                      'title': r['title'],
                      "votes": r['upvotes'] - r['downvotes'],
                      'url': self.get_onetime_url(r['url']),
                      'description': r['description'],
                      'descriptionText': r['descriptionText']}
                     for r in self.recommendations]
        resources = sorted(resources, key=lambda r: r['votes'], reverse=True)

        frag = Fragment(
            self.template_lookup.get_template("recommender.html").render(
                resources=resources,
                upvoted_ids=self.upvoted_ids,
                downvoted_ids=self.downvoted_ids,
                endorsed_recommendation_ids=self.endorsed_recommendation_ids,
                endorsed_recommendation_reasons=self.endorsed_recommendation_reasons,
                flagged_ids=self.flagged_ids,
                flagged_reasons=self.flagged_reasons
            )
        )
        frag.add_css_url("//ajax.googleapis.com/ajax/libs/jqueryui/1.10.4/themes/smoothness/jquery-ui.css")
        frag.add_javascript_url("//ajax.googleapis.com/ajax/libs/jqueryui/1.10.4/jquery-ui.min.js")
        frag.add_css(self.resource_string("static/css/tooltipster.css"))
        frag.add_css(self.resource_string("static/css/recommender.css"))
        frag.add_javascript(self.resource_string("static/js/src/jquery.tooltipster.min.js"))
        frag.add_javascript(self.resource_string("static/js/src/cats.js"))
        frag.add_javascript(self.resource_string("static/js/src/recommender.js"))
        frag.initialize_js('RecommenderXBlock')
        return frag

    @staticmethod
    def workbench_scenarios():
        """
        A canned scenario for display in the workbench.
        """
        return [
            (
                "RecommenderXBlock",
                """
                <vertical_demo>
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
                """
            ),
        ]

    @classmethod
    def parse_xml(cls, node, runtime, keys, _id_generator):
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
