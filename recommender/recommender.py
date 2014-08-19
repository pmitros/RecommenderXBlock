"""
This XBlock will show a set of recommended resources which may be helpful to
students solving a given problem.
"""
import json
import hashlib
import pkg_resources
import itertools


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

from fs.s3fs import S3FS
from webob.response import Response


class RecommenderXBlock(XBlock):
    """
    This XBlock will show a set of recommended resources which may be helpful to students solving a given problem.
    The resources are provided and edited by students; they can also vote for useful resources and flag problematic ones.
    """
    default_recommendations = List(help="List of default help resources",
                                   default=[], scope=Scope.content)
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

    recommendations = List(help="List of help resources", default=[],
                           scope=Scope.user_state_summary)
    # A list of recommenations provided by students, it is a JSON object
    #    aggregated across many users of a single block.
    # Usage: the same as default_recommendations

    s3_configuration = Dict(help="Dictionary of Amazon S3 information",
                            default={}, scope=Scope.user_state_summary)
    # TODO: Switch to a Filesystem field once folded into edx-platform
    # A dictionary of Amazon S3 information for file uploading, it is a JSON
    #    object aggregated across many users of a single block.
    # Usage: s3_configuration = {
    #    "aws_access_key": (String) access key of Amazon S3 account
    #    "aws_secret_key": (String) secret key of Amazon S3 account
    #    "bucketName": (String) Bucket name of Amazon S3 account
    #    "uploadedFileDir": (String) The path (relative to root directory) of
    #            the directory for storing uploaded files }

    deleted_recommendation_ids = List(help="List of deleted resources' ID",
                                      default=[],
                                      scope=Scope.user_state_summary)
    # A list of deleted recommendations' ids, it is a JSON object aggregated
    #    across many users of a single block.
    # Usage: deleted_recommendation_ids[index] = (Integer) id of a deleted
    #    resource

    endorsed_recommendation_ids = List(help="List of endorsed resources' ID",
                                       default=[],
                                       scope=Scope.user_state_summary)
    # A list of endorsed recommendations' ids, it is a JSON object aggregated
    #    across many users of a single block.
    # Usage: endorsed_recommendation_ids[index] = (Integer) id of a
    #    endorsed resource

    flagged_accum_ids = List(help="List of problematic resources' ids which " +
                             "at least one user flagged to", default=[],
                             scope=Scope.user_state_summary)
    # TODO: For instructor interface
    # A list of problematic recommendations' ids which at least one user
    #    flagged to; it is a JSON object aggregated across many users of
    #    a single block.
    # Usage: flagged_accum_ids[index] = (Integer) id of a problematic
    #    resource which was flagged by at least one user

    flagged_accum_reasons = List(help="List of reasons why the corresponding" +
                                 " resources were flagged by user as " +
                                 "problematic", default=[],
                                 scope=Scope.user_state_summary)
    # TODO: For instructor interface
    # A list of reasons why the corresponding resources were flagged by user
    #    as problematic; it is a JSON object aggregated across many users of
    #    a single block.
    # Usage: flagged_accum_reasons[index] = (String) list of reasons why the
    #    resource 'flagged_accum_ids[index]' was flagged by user as problematic

    upvoted_ids = List(help="List of resources' ids which user upvoted to",
                       default=[], scope=Scope.user_state)
    # A list of recommendations' ids which user upvoted to; it is a JSON
    #    object for one user, for one block, and for one run of a course.
    # Usage: upvoted_ids[index] = (Integer) id of a resource which was
    #    upvoted by the current user

    downvoted_ids = List(help="List of resources' ids which user downvoted to",
                         default=[], scope=Scope.user_state)
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

    flagged_reasons = List(help="List of reasons why the corresponding " +
                           "resources were flagged by user as problematic",
                           default=[], scope=Scope.user_state)
    # A list of reasons why the corresponding resources were flagged by user as
    #    problematic; it is a JSON object for one user, for one block, and for
    #    one run of a course.
    # Usage: flagged_reasons[index] = (String) reason why the resource
    #   'flagged_ids[index]' was flagged by the current user as problematic

    template_lookup = None

    resource_content_fields = ['url', 'title', 'description',
                               'descriptionText']
    # the dictionary keys for storing the content of a recommendation

    def get_user_is_staff(self):
        """
        Return self.xmodule_runtime.user_is_staff
        """
        return self.xmodule_runtime.user_is_staff

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
        recommendations = self.recommendations or self.default_recommendations
        active_rec_ids = (rec["id"] for rec in recommendations)
        rec_ids = itertools.chain(active_rec_ids, self.deleted_recommendation_ids)
        try:
            max_recommendation_id = max(rec_ids)
        except ValueError:  # rec_ids is an empty generator
            max_recommendation_id = -1
        return max_recommendation_id + 1

    def check_redundancy(self, url1, url2):
        """
        Check redundant resource by comparing the url.
        This is not designed for security, just to check common errors/use-cases
        """
        return (url1.split('#')[0].split('%23')[0] ==
                url2.split('#')[0].split('%23')[0])

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
        idx = self.recommenations.index(resource_id)
        result = {}
        result['id'] = resource_id
        if idx > len(self.recommendations):
            result['error'] = 'bad id'
            result['Success'] = False
            tracker.emit('recommender_upvote', result)
            return result

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
        idx = self.recommenations.index(resource_id)
        result = {}
        result['id'] = resource_id
        if idx > len(self.recommendations):
            result['error'] = 'bad id'
            result['Success'] = False
            tracker.emit('recommender_downvote', result)
            return result

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
        # TODO: Switch to a Filesystem field once folded into edx-platform
        if self.s3_configuration == {}:
            response = Response()
            response.body = 'IMPROPER_S3_SETUP'
            response.headers['Content-Type'] = 'text/plain'
            tracker.emit('upload_screenshot',
                         {'uploadedFileName': response.body})
            return response

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

        # Check whether file size exceeds threshold (4MB)
        # already done in request submission, handled in client side

        try:
            s3fs_handler = S3FS(
                self.s3_configuration['bucketName'],
                aws_access_key=self.s3_configuration['aws_access_key'],
                aws_secret_key=self.s3_configuration['aws_secret_key'])

            dir_url = s3fs_handler.getpathurl("/")
            content = request.POST['file'].file.read()
            file_id = hashlib.md5(content).hexdigest()
            file_name = (str(self.s3_configuration['uploadedFileDir']) +
                         file_id + file_type)

            fhwrite = s3fs_handler.open(file_name, 'wb')
            fhwrite.write(content)
            fhwrite.close()
            s3fs_handler.makepublic(file_name)
        except BaseException:
            response = Response()
            response.body = 'IMPROPER_S3_SETUP'
            response.headers['Content-Type'] = 'text/plain'
            tracker.emit('upload_screenshot',
                         {'uploadedFileName': response.body})
            return response

        response = Response()
        if self.s3_configuration['uploadedFileDir'] == "/":
            response.body = str(dir_url + file_id + file_type)
        else:
            response.body = str(dir_url +
                                self.s3_configuration['uploadedFileDir'] +
                                file_id + file_type)
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
                result['error'] = 'redundant resource'
                for field in self.resource_content_fields:
                    result['dup_' + field] = self.recommendations[
                        self.recommendations.index(recommendation)][field]
                result['dup_id'] = self.recommendations[
                    self.recommendations.index(recommendation)]['id']
                result['Success'] = False
                tracker.emit('add_resource', result)
                return result

        result['id'] = self.get_resource_new_id()

        result['upvotes'] = 0
        result['downvotes'] = 0
        self.recommendations.append(result)
        result['Success'] = True
        tracker.emit('add_resource', result)
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
        result = {}
        result['id'] = resource_id
        idx = self.recommenations.index(resource_id)
        if idx > len(self.recommendations):
            result['error'] = 'bad id'
            result['Success'] = False
            tracker.emit('edit_resource', result)
            return result

        for field in self.resource_content_fields:
            result['old_' + field] = self.recommendations[idx][field]
            if data[field] == "":
                result[field] = self.recommendations[idx][field]
            else:
                result[field] = data[field]
        # check url for redundancy
        if not(self.check_redundancy(self.recommendations[idx]['url'],
                                     data['url'])):
            for recommendation in self.recommendations:
                if self.check_redundancy(recommendation['url'], data['url']):
                    result['error'] = 'existing url'
                    for field in self.resource_content_fields:
                        result['dup_' + field] = self.recommendations[
                            self.recommendations.index(recommendation)][field]
                    result['dup_id'] = self.recommendations[
                        self.recommendations.index(recommendation)]['id']
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
        if data['isProblematic']:
            if data['id'] in self.flagged_ids:
                result['oldReason'] = self.flagged_reasons[
                    self.flagged_ids.index(data['id'])]
                self.flagged_reasons[
                    self.flagged_ids.index(data['id'])] = data['reason']
            else:
                self.flagged_ids.append(data['id'])
                self.flagged_reasons.append(data['reason'])
        else:
            if data['id'] in self.flagged_ids:
                result['oldReason'] = self.flagged_reasons[
                    self.flagged_ids.index(data['id'])]
                result['reason'] = ''
                idx = self.flagged_ids.index(data['id'])
                del self.flagged_ids[idx]
                del self.flagged_reasons[idx]
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
    def set_s3_info(self, data, _suffix=''):
        """
        Set required information of amazon web service for file uploading.

        Args:
                data: dict in JSON format
                data['aws_access_key']: Amazon Web Services access key
                data['aws_secret_key']: Amazon Web Services secret key
                data['bucketName']: Bucket name of your Amazon Web Services
                data['uploadedFileDir']: Directory for your upload files
        Returns:
                result['Success']: the boolean indicator for whether the setting is complete
        """
        if not self.get_user_is_staff():
            result = {
                'error': 'Set S3 information without permission',
                'Success': False
            }
            tracker.emit('set_s3_info', result)
            return result
        self.s3_configuration['aws_access_key'] = data['aws_access_key']
        self.s3_configuration['aws_secret_key'] = data['aws_secret_key']
        self.s3_configuration['bucketName'] = data['bucketName']
        if data['uploadedFileDir'][len(data['uploadedFileDir']) - 1] == '/':
            self.s3_configuration['uploadedFileDir'] = data['uploadedFileDir']
        else:
            self.s3_configuration['uploadedFileDir'] = (data['uploadedFileDir']
                                                        + '/')
        result = self.s3_configuration.copy()
        result['Success'] = True
        tracker.emit('set_s3_info', result)
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
            result = {
                'error': 'Endorse resource without permission',
                'Success': False
            }
            tracker.emit('endorse_resource', result)
            return result
        resource_id = data['id']
        result = {}
        result['id'] = resource_id
        idx = self.recommenations.index(resource_id)
        if idx > len(self.recommendations):
            result['error'] = 'bad id'
            result['Success'] = False
            tracker.emit('endorse_resource', result)
            return result

        if resource_id in self.endorsed_recommendation_ids:
            result['status'] = 'undo endorsement'
            del self.endorsed_recommendation_ids[
                self.endorsed_recommendation_ids.index(resource_id)]
        else:
            result['status'] = 'endorsement'
            self.endorsed_recommendation_ids.append(resource_id)

        result['Success'] = True
        tracker.emit('endorse_resource', result)
        return result

    @XBlock.json_handler
    def delete_resource(self, data, _suffix=''):
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
        if not self.get_user_is_staff():
            result = {
                'error': 'Delete resource without permission',
                'Success': False
            }
            tracker.emit('delete_resource', result)
            return result
        resource_id = data['id']
        result = {}
        result['id'] = resource_id
        idx = self.recommenations.index(resource_id)
        if idx > len(self.recommendations):
            result['error'] = 'bad id'
            result['Success'] = False
            tracker.emit('delete_resource', result)
            return result

        result['upvotes'] = self.recommendations[idx]['upvotes']
        result['downvotes'] = self.recommendations[idx]['downvotes']
        for field in self.resource_content_fields:
            result[field] = self.recommendations[idx][field]
        self.deleted_recommendation_ids.append(resource_id)
        del self.recommendations[idx]
        result['Success'] = True
        tracker.emit('delete_resource', result)
        return result

    def student_view(self, _context=None):
        """
        The primary view of the RecommenderXBlock, shown to students
        when viewing courses.
        """
        self.recommendations = (
            self.recommendations or
            self.default_recommendations or
            []
        )

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
                      'url': r['url'],
                      'description': r['description'],
                      'descriptionText': r['descriptionText']}
                     for r in self.recommendations]
        resources = sorted(resources, key=lambda r: r['votes'], reverse=True)

        frag = Fragment(self.template_lookup.get_template("recommender.html")
                        .render(resources=resources,
                                upvoted_ids=self.upvoted_ids,
                                downvoted_ids=self.downvoted_ids,
                                endorsed_recommendation_ids=self.endorsed_recommendation_ids,
                                flagged_ids=self.flagged_ids,
                                flagged_reasons=self.flagged_reasons))
        frag.add_css_url("//ajax.googleapis.com/ajax/libs/jqueryui/1.10.4/" +
                         "themes/smoothness/jquery-ui.css")
        frag.add_javascript_url("//ajax.googleapis.com/ajax/libs/jqueryui/" +
                                "1.10.4/jquery-ui.min.js")
        frag.add_css(self.resource_string("static/css/tooltipster.css"))
        frag.add_css(self.resource_string("static/css/recommender.css"))
        frag.add_javascript(self.resource_string("static/js/src/" +
                                                 "jquery.tooltipster.min.js"))
        frag.add_javascript(self.resource_string("static/js/src/cats.js"))
        frag.add_javascript(self.resource_string("static/js/src/" +
                                                 "recommender.js"))
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
