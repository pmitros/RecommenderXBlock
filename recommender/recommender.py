"""
This XBlock will show a set of recommended resources which may be helpful to
students solving a given problem.
"""
from __future__ import absolute_import

import codecs
import hashlib
import json
import lxml.etree as etree
import pkg_resources
import re

from copy import deepcopy

import six
from six.moves.urllib.parse import unquote_plus, urlparse, urlunparse

import bleach
from mako.lookup import TemplateLookup
from webob.response import Response

from xblock.core import XBlock
from xblock.exceptions import JsonHandlerError
from xblock.fields import Scope, List, Dict, Boolean, String, JSONField
from xblock.fragment import Fragment
from xblock.reference.plugins import Filesystem

# TODO: Should be updated once XBlocks and tracking logs have finalized APIs
# and documentation.
try:
    from eventtracking import tracker
except ImportError:
    class tracker(object):  # pylint: disable=invalid-name
        """
        Define tracker if eventtracking cannot be imported. This is a workaround
        so that the code works in both edx-platform and XBlock workbench (the latter
        of which does not support event emission). This should be replaced with XBlock's
        emit(), but at present, emit() is broken.
        """
        def __init__(self):
            """ Do nothing """
            pass

        @staticmethod
        def emit(param1, param2):
            """ In workbench, do nothing for event emission """
            pass


def stem_url(url):
    """
    Get the base form of url.
    This is not designed for security, just to check common errors/use-cases.
    """
    parsed_url = urlparse(unquote_plus(url))
    return urlunparse(parsed_url._replace(fragment=''))


def data_structure_upgrade(old_list):
    """
    This is a data migration from an earlier prototype.
    We store the resources with dictionary, instead of lists
    as before.
    """
    if isinstance(old_list, list):
        new_dict = {}
        for item in old_list:
            resource_id = stem_url(item['url'])
            item['id'] = resource_id
            new_dict[resource_id] = item
        return new_dict
    else:
        return old_list


template_lookup = None


class HelperXBlock(XBlock):
    ''' Generic functionality usable across XBlocks but not yet in the platform '''
    def get_user_is_staff(self):
        """
        Return self.xmodule_runtime.user_is_staff
        This is not a supported part of the XBlocks API. User data is still
        being defined. However, It's the only way to get the data right now.
        TODO: Should be proper handled in future
        """
        # This is a workaround so that the code works in both edx-platform
        # and XBlock workbench (the latter of which does not have the
        # information of users). This should be replaced with XBlock's
        # xmodule_runtime.user_is_staff, but at present,
        # xmodule_runtime.user_is_staff is broken.
        if "workbench" in str(type(self.runtime)):
            return True
        return self.xmodule_runtime.user_is_staff

    def get_user_id(self):
        """
        Return the user id.
        This is not a supported part of the XBlocks API. User data is still
        being defined. However, It's the only way to get the data right now.
        TODO: Should be proper handled in future
        """
        # This is a workaround so that the code works in both edx-platform
        # and XBlock workbench (the latter of which does not have the
        # information of users). This should be replaced with XBlock's
        # xmodule_runtime.anonymous_student_id, but at present,
        # xmodule_runtime.anonymous_student_id is broken.
        if "workbench" in str(type(self.runtime)):
            return 'user1'
        return self.xmodule_runtime.anonymous_student_id

    def resource_string(self, path):
        """
        Handy helper for getting static file resources from our Python package.
        """
        data = pkg_resources.resource_string(__name__, path)
        return data.decode("utf8")


@XBlock.needs('fs')
@XBlock.needs('i18n')
class RecommenderXBlock(HelperXBlock):
    """
    This XBlock will show a set of recommended resources which may be helpful
    to students solving a given problem. The resources are provided and edited
    by students; they can also vote for useful resources and flag problematic
    ones.
    """
    seen = Boolean(
        help="Has the student interacted with the XBlock before? Used to show optional tutorial.",
        default=False,
        scope=Scope.user_info
    )

    version = String(
        help="The version of this RecommenderXBlock. Used to simplify migrations.",
        default="recommender.v1.0",
        scope=Scope.content
    )

    intro_enabled = Boolean(
        help="Should we show the users a short usage tutorial the first time they see the XBlock?",
        default=True,
        scope=Scope.content
    )

    # A dict of default recommendations supplied by the instructors to
    # seed the list with before students add new recommendations.

    # Also, useful for testing.
    # Usage: default_recommendations[index] = {
    #    "id": (String) A unique ID. The ID is currently derived from
    #          the URL, but this has changed and may change again
    #    "title": (String) a 1-3 sentence summary description of a resource
    #    "upvotes" : (Integer) number of upvotes,
    #    "downvotes" : (Integer) number of downvotes,
    #    "url" : (String) link to resource,
    #    "description" : (String) the url of a resource's screenshot.
    #                    'screenshot' would be a better name, but would
    #                    require a cumbersome data migration.
    #    "descriptionText" : (String) a potentially longer overview of the resource }
    #    we use url as key (index) of resource
    default_recommendations = JSONField(
        help="Dict of instructor-supplied help resources to seed the resource list with.",
        default={},
        scope=Scope.content
    )

    # A dict of recommendations provided by students.
    # Usage: the same as default_recommendations
    recommendations = JSONField(
        help="Current set of recommended resources",
        default={},
        scope=Scope.user_state_summary
    )

    # A list of recommendations removed by course staff. This is used to filter out
    # cheats, give-aways, spam, etc.
    # Usage: the same as default_recommendations plus
    #    removed_recommendations[index]['reason'] = (String) the reason why
    #            course staff remove this resource
    removed_recommendations = Dict(
        help="Dict of removed resources",
        default={},
        scope=Scope.user_state_summary
    )

    # A list of endorsed recommendations' ids -- the recommendations the course
    # staff marked as particularly helpful.
    # Usage: endorsed_recommendation_ids[index] = (String) id of a
    #    endorsed resource
    endorsed_recommendation_ids = List(
        help="List of endorsed resources' ID",
        default=[],
        scope=Scope.user_state_summary
    )

    # A list of reasons why the resources were endorsed.
    # Usage: endorsed_recommendation_reasons[index] = (String) the reason
    #    why the resource (id = endorsed_recommendation_ids[index]) is endorsed
    endorsed_recommendation_reasons = List(
        help="List of reasons why the resources are endorsed",
        default=[],
        scope=Scope.user_state_summary
    )

    # A dict of problematic recommendations which are flagged by users for review
    # by instructors. Used to remove spam, etc.
    # Usage: flagged_accum_resources[userId] = {
    #    "problematic resource id": (String) reason why the resource is
    #            flagged as problematic by that user }
    flagged_accum_resources = Dict(
        help="Dict of potentially problematic resources which were flagged by users",
        default={},
        scope=Scope.user_state_summary
    )

    # A list of recommendations' ids which a particular user upvoted, so users
    # cannot vote twice
    # Usage: upvoted_ids[index] = (String) id of a resource which was
    #    upvoted by the current user
    upvoted_ids = List(
        help="List of resources' ids which user upvoted",
        default=[],
        scope=Scope.user_state
    )

    # A list of recommendations' ids which user downvoted, so users cannot vote twice.
    # Usage: downvoted_ids[index] = (String) id of a resource which was
    #    downvoted by the current user
    downvoted_ids = List(
        help="List of resources' ids which user downvoted",
        default=[],
        scope=Scope.user_state
    )

    # A list of problematic recommendations' ids which user flagged.
    # Usage: flagged_ids[index] = (String) id of a problematic resource which
    #    was flagged by the current user
    flagged_ids = List(
        help="List of problematic resources' ids which the user flagged",
        default=[],
        scope=Scope.user_state
    )

    # A list of reasons why the resources corresponding to those in flagged_ids were flagged
    # Usage: flagged_reasons[index] = (String) reason why the resource
    #   'flagged_ids[index]' was flagged by the current user as problematic
    flagged_reasons = List(
        help="List of reasons why the corresponding resources were flagged",
        default=[],
        scope=Scope.user_state
    )

    # The file system we used to store uploaded screenshots
    fs = Filesystem(help="File system for screenshots", scope=Scope.user_state_summary)

    client_configuration = Dict(
        help="Dict of customizable settings",
        default={
            'disable_dev_ux': True,
            'entries_per_page': 5,
            'page_span': 2
        },
        scope=Scope.content
    )

    # the dictionary keys for storing the content of a recommendation
    resource_content_fields = [
        'url', 'title', 'description', 'descriptionText'
    ]

    def _get_onetime_url(self, filename):
        """
        Return one time url for uploaded screenshot

        We benchmarked this as less than 8ms on a sandbox machine.
        """
        if filename.startswith('fs://'):
            return str(self.fs.get_url(filename.replace('fs://', ''), 1000 * 60 * 60 * 10))
        else:
            return filename

    def _error_handler(self, error_msg, event, resource_id=None):
        """
        Generate an error dictionary if something unexpected happens, such as
        a user upvoting a resource which no longer exists. We both log to this
        to the event logs, and return to the browser.
        """
        result = {'error': error_msg}
        if resource_id is not None:
            result['id'] = resource_id
        tracker.emit(event, result)
        raise JsonHandlerError(400, result['error'])

    def _check_location_input(self, url, event_name, result):
        """
        Check whether the submitted location url resource is invalid. If true, raise an
        exception and return a HTTP status code for the error.
        """
        if not url:
            result['error'] = self.ugettext('Invalid location URL provided')
            tracker.emit(event_name, result)
            raise JsonHandlerError(400, result['error'])

    def _check_redundant_resource(self, resource_id, event_name, result):
        """
        Check whether the submitted resource is redundant. If true, raise an
        exception and return a HTTP status code for the error.
        """
        # check url for redundancy
        if resource_id in self.recommendations:
            result['error'] = self.ugettext('The resource you are attempting to provide already exists')
            for field in self.resource_content_fields:
                result['dup_' + field] = self.recommendations[resource_id][field]
            result['dup_id'] = self.recommendations[resource_id]['id']
            tracker.emit(event_name, result)
            raise JsonHandlerError(409, result['error'])

    def _check_removed_resource(self, resource_id, event_name, result):
        """
        Check whether the submitted resource is removed. If true, raise an
        exception and return a HTTP status code for the error.
        """
        if resource_id in self.removed_recommendations:
            result['error'] = self.ugettext('The resource you are attempting to '
                                            'provide has been disallowed by the staff. '
                                            'Reason: ' + self.removed_recommendations[resource_id]['reason'])
            for field in self.resource_content_fields:
                result['dup_' + field] = self.removed_recommendations[resource_id][field]
            result['dup_id'] = self.removed_recommendations[resource_id]['id']
            tracker.emit(event_name, result)
            raise JsonHandlerError(405, result['error'])

    def _validate_resource(self, data_id, event):
        """
        Validate whether the resource exists in the database. If not,
        generate the error message, and return to the browser for a given
        event, otherwise, return the stemmed id.
        """
        resource_id = strip_and_clean_url(data_id)
        if resource_id not in self.recommendations:
            msg = self.ugettext('The selected resource does not exist')
            self._error_handler(msg, event, resource_id)
        return resource_id

    def _check_upload_file(self, request, file_types, file_type_error_msg, event, file_size_threshold):
        """
        Check the type and size of uploaded file. If the file type is
        unexpected or the size exceeds the threshold, log the error and return
        to browser, otherwise, return None.
        """
        # Check invalid file types
        file_type_error = False
        file_type = [ft for ft in file_types
                     if any(str(request.POST['file'].file).lower().endswith(ext)
                            for ext in file_types[ft]['extension'])]

        # Check extension
        if not file_type:
            file_type_error = True
        else:
            file_type = file_type[0]
            # Check mimetypes
            if request.POST['file'].file.content_type not in file_types[file_type]['mimetypes']:
                file_type_error = True
            else:
                if 'magic' in file_types[file_type]:
                    # Check magic number
                    headers = file_types[file_type]['magic']
                    file_pointer = request.POST['file'].file
                    file_magic_number = file_pointer.read(int(len(headers[0]) / 2))

                    if codecs.encode(file_magic_number, 'hex').decode('utf-8') not in headers:
                        file_type_error = True
                    request.POST['file'].file.seek(0)

        if file_type_error:
            response = Response()
            tracker.emit(event, {'uploadedFileName': 'FILE_TYPE_ERROR'})
            response.status = 415
            response.text = json.dumps({'error': file_type_error_msg})
            response.headers['Content-Type'] = 'application/json'
            return response

        # Check whether file size exceeds threshold (30MB)
        if request.POST['file'].file.size > file_size_threshold:
            response = Response()
            tracker.emit(event, {'uploadedFileName': 'FILE_SIZE_ERROR'})
            response.status = 413
            response.text = json.dumps({'error': self.ugettext('Size of uploaded file exceeds threshold')})
            response.headers['Content-Type'] = 'application/json'
            return response

        return file_type

    def _raise_pyfs_error(self, event):
        """
        Log and return an error if the pyfs is not properly set.
        """
        response = Response()
        error = self.ugettext('The configuration of pyfs is not properly set')
        tracker.emit(event, {'uploadedFileName': 'IMPROPER_FS_SETUP'})
        response.status = 404
        response.text = json.dumps({'error': error})
        response.headers['Content-Type'] = 'application/json'
        return response

    def _init_template_lookup(self):
        """
        Initialize template_lookup by adding mappings between strings and urls.
        """
        global template_lookup
        template_lookup = TemplateLookup()
        template_lookup.put_string(
            "recommenderstudio.html",
            self.resource_string("static/html/recommenderstudio.html"))
        template_lookup.put_string(
            "recommender.html",
            self.resource_string("static/html/recommender.html"))
        template_lookup.put_string(
            "resourcebox.html",
            self.resource_string("static/html/resourcebox.html"))

    def get_client_configuration(self):
        """
        Return the parameters for client-side configuration settings.

        Returns:
                disable_dev_ux: feature flag for any new UX under development
                                which should not appear in prod
                entries_per_page: the number of resources in each page
                page_span: page range in pagination control
                intro: whether to take users through a short usage tutorial
                       the first time they see the RecommenderXBlock
                is_user_staff: whether the user is staff
        """
        result = self.client_configuration.copy()
        result['is_user_staff'] = self.get_user_is_staff()
        result['intro'] = not self.seen and self.intro_enabled
        if not self.seen:
            # Mark the user who interacted with the XBlock first time as seen,
            # in order not to show the usage tutorial in future.
            self.seen = True
        tracker.emit('get_client_configuration', result)
        return result

    @XBlock.json_handler
    def set_client_configuration(self, data, _suffix=''):  # pylint: disable=unused-argument
        """
        Set the parameters for student-view, client side configurations.

        Args:
                data: dict in JSON format. Keys in data:
                  disable_dev_ux: feature flag for any new UX under development
                                  which should not appear in prod
                  entries_per_page: the number of resources in each page
                  page_span: page range in pagination control
                  intro_enable: Should we show the users a short usage tutorial
                                the first time they see the XBlock?
        """
        self.intro_enabled = data['intro_enable']
        for key in ['disable_dev_ux', 'page_span', 'entries_per_page']:
            self.client_configuration[key] = data[key]

        tracker.emit('set_client_configuration', data)
        return {}

    @XBlock.json_handler
    def handle_vote(self, data, _suffix=''):  # pylint: disable=unused-argument
        """
        Add/Subtract a vote to a resource entry.

        Args:
                data: dict in JSON format
                data['id']: the ID of the resouce which was upvoted/downvoted
                data['event']: recommender_upvote or recommender_downvote
        Returns:
                result: dict in JSON format
                result['error']: error message generated if the process fails
                result['oldVotes']: original # of votes
                result['newVotes']: votes after this action
                result['toggle']: boolean indicator for whether the resource
                                  was switched from downvoted to upvoted
        """
        resource_id = self._validate_resource(data['id'], data['event'])

        result = {}
        result['id'] = resource_id
        is_event_upvote = (data['event'] == 'recommender_upvote')
        result['oldVotes'] = (self.recommendations[resource_id]['upvotes'] -
                              self.recommendations[resource_id]['downvotes'])

        upvoting_existing_upvote = is_event_upvote and resource_id in self.upvoted_ids
        downvoting_existing_downvote = not is_event_upvote and resource_id in self.downvoted_ids

        if upvoting_existing_upvote:
            # While the user is trying to upvote a resource which has been
            # upvoted, we restore the resource to unvoted
            self.upvoted_ids.remove(resource_id)
            self.recommendations[resource_id]['upvotes'] -= 1
        elif downvoting_existing_downvote:
            # While the user is trying to downvote a resource which has
            # been downvoted, we restore the resource to unvoted
            self.downvoted_ids.remove(resource_id)
            self.recommendations[resource_id]['downvotes'] -= 1
        elif is_event_upvote:  # New upvote
            if resource_id in self.downvoted_ids:
                self.downvoted_ids.remove(resource_id)
                self.recommendations[resource_id]['downvotes'] -= 1
                result['toggle'] = True
            self.upvoted_ids.append(resource_id)
            self.recommendations[resource_id]['upvotes'] += 1
        else:  # New downvote
            if resource_id in self.upvoted_ids:
                self.upvoted_ids.remove(resource_id)
                self.recommendations[resource_id]['upvotes'] -= 1
                result['toggle'] = True
            self.downvoted_ids.append(resource_id)
            self.recommendations[resource_id]['downvotes'] += 1

        result['newVotes'] = (self.recommendations[resource_id]['upvotes'] -
                              self.recommendations[resource_id]['downvotes'])
        tracker.emit(data['event'], result)
        return result

    @XBlock.handler
    def upload_screenshot(self, request, _suffix=''):  # pylint: disable=unused-argument
        """
        Upload a screenshot for an entry of resource as a preview (typically to S3 or filesystem).

        Args:
                request: HTTP POST request
                request.POST['file'].file: the file to be uploaded
        Returns:
                response: HTTP response
                response.text (response.responseText): name of the uploaded file

        We validate that this is a valid JPG, GIF, or PNG by checking magic number, mimetype,
        and extension all correspond. We also limit to 30MB. We save the file under its MD5
        hash to (1) avoid name conflicts, (2) avoid race conditions and (3) save space.
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
        file_type_error_msg = 'Please upload an image in GIF/JPG/PNG'
        result = self._check_upload_file(
            request, image_types, file_type_error_msg, 'upload_screenshot', 31457280
        )
        if isinstance(result, Response):
            return result

        try:
            content = request.POST['file'].file.read()
            file_id = hashlib.md5(content).hexdigest()
            file_name = u'{}.{}'.format(file_id, result)

            fhwrite = self.fs.open(file_name, "wb")
            fhwrite.write(content)
            fhwrite.close()
        except IOError:
            return self._raise_pyfs_error('upload_screenshot')

        response = Response()
        response.text = json.dumps({'file_name': str("fs://" + file_name)})
        response.headers['Content-Type'] = 'application/json'
        tracker.emit('upload_screenshot',
                     {'uploadedFileName': response.body})
        response.status = 200
        return response

    @XBlock.json_handler
    def add_resource(self, data, _suffix=''):  # pylint: disable=unused-argument
        """
        Add a new resource entry.

        Args:
                data: dict in JSON format
                data[resource_content_field]: the resource to be added. Dictionary of
                                              description, etc. as defined above
        Returns:
                result: dict in JSON format
                result['error']: error message generated if the addition fails
                result[resource_content_field]: the content of the added resource
        """
        # Construct new resource
        result = {}
        for field in self.resource_content_fields:
            if field == 'url':
                result[field] = strip_and_clean_url(data[field])
            else:
                result[field] = strip_and_clean_html_elements(data[field])

        resource_id = result['url']
        self._check_location_input(result['url'], 'add_resource', result)
        self._check_redundant_resource(resource_id, 'add_resource', result)
        self._check_removed_resource(resource_id, 'add_resource', result)

        result['id'] = resource_id

        result['upvotes'] = 0
        result['downvotes'] = 0
        self.recommendations[resource_id] = dict(result)
        tracker.emit('add_resource', result)
        result["description"] = self._get_onetime_url(result["description"])
        return result

    @XBlock.json_handler
    def edit_resource(self, data, _suffix=''):  # pylint: disable=unused-argument
        """
        Edit an entry of existing resource.

        Args:
                data: dict in JSON format
                data['id']: the ID of the edited resouce
                data[resource_content_field]: the content of the resource to be edited
        Returns:
                result: dict in JSON format
                result['error']: the error message generated when the edit fails
                result[old_resource_content_field]: the content of the resource before edited
                result[resource_content_field]: the content of the resource after edited
        """
        resource_id = self._validate_resource(data['id'], 'edit_resource')

        result = {}
        result['id'] = resource_id
        result['old_id'] = resource_id

        for field in self.resource_content_fields:
            old_recommendation_field_data = strip_and_clean_html_elements(self.recommendations[resource_id][field])
            result['old_' + field] = old_recommendation_field_data
            # If the content in resource is unchanged (i.e., data[field] is
            # empty), return and log the content stored in the database
            # (self.recommendations), otherwise, return and log the edited
            # one (data[field])
            if data[field] == "":
                result[field] = old_recommendation_field_data
            elif field == 'url':
                result[field] = strip_and_clean_url(data[field])
            else:
                result[field] = strip_and_clean_html_elements(data[field])

        # Handle resource ID changes
        edited_resource_id = result['url']
        if edited_resource_id != resource_id:
            self._check_location_input(result['url'], 'add_resource', result)
            self._check_redundant_resource(edited_resource_id, 'edit_resource', result)
            self._check_removed_resource(edited_resource_id, 'edit_resource', result)

            self.recommendations[edited_resource_id] = deepcopy(self.recommendations[resource_id])
            self.recommendations[edited_resource_id]['id'] = edited_resource_id
            result['id'] = edited_resource_id
            del self.recommendations[resource_id]

        # Handle all other changes
        for field in data:
            if field == 'id':
                continue
            if data[field] == "":
                continue
            self.recommendations[edited_resource_id][field] = data[field]

        tracker.emit('edit_resource', result)
        result["description"] = self._get_onetime_url(result["description"])
        return result

    @XBlock.json_handler
    def flag_resource(self, data, _suffix=''):  # pylint: disable=unused-argument
        """
        Flag (or unflag) an entry of problematic resource and give the reason. This shows in a
        list for staff to review.

        Args:
                data: dict in JSON format
                data['id']: the ID of the problematic resouce
                data['isProblematic']: the boolean indicator for whether the resource is being
                                       flagged or unflagged. Only flagging works.
                data['reason']: the reason why the user believes the resource is problematic
        Returns:
                result: dict in JSON format
                result['reason']: the new reason
                result['oldReason']: the old reason
                result['id']: the ID of the problematic resouce
                result['isProblematic']: the boolean indicator for whether the resource
                                         is now flagged
        """
        result = {}
        result['id'] = data['id']
        result['isProblematic'] = data['isProblematic']
        clean_data_reason = strip_and_clean_html_elements(data['reason'])
        result['reason'] = clean_data_reason

        user_id = self.get_user_id()

        # If already flagged, update the reason for the flag
        if data['isProblematic']:
            # If already flagged, update the reason
            if data['id'] in self.flagged_ids:
                result['oldReason'] = self.flagged_reasons[
                    self.flagged_ids.index(data['id'])]
                self.flagged_reasons[
                    self.flagged_ids.index(data['id'])] = clean_data_reason
            # Otherwise, flag it.
            else:
                self.flagged_ids.append(data['id'])
                self.flagged_reasons.append(clean_data_reason)

                if user_id not in self.flagged_accum_resources:
                    self.flagged_accum_resources[user_id] = {}
            self.flagged_accum_resources[user_id][data['id']] = clean_data_reason
        # Unflag resource. Currently unsupported.
        else:
            if data['id'] in self.flagged_ids:
                result['oldReason'] = self.flagged_reasons[
                    self.flagged_ids.index(data['id'])]
                result['reason'] = ''
                idx = self.flagged_ids.index(data['id'])
                del self.flagged_ids[idx]
                del self.flagged_reasons[idx]

                del self.flagged_accum_resources[user_id][data['id']]
        tracker.emit('flag_resource', result)
        return result

    @XBlock.json_handler
    def endorse_resource(self, data, _suffix=''):  # pylint: disable=unused-argument
        """
        Endorse an entry of resource. This shows the students the
        resource has the staff seal of approval.

        Args:
                data: dict in JSON format
                data['id']: the ID of the resouce to be endorsed
        Returns:
                result: dict in JSON format
                result['error']: the error message generated when the endorsement fails
                result['id']: the ID of the resouce to be endorsed
                result['status']: endorse the resource or undo it
        """
        # Auth+auth
        if not self.get_user_is_staff():
            msg = self.ugettext('Endorse resource without permission')
            self._error_handler(msg, 'endorse_resource')

        resource_id = self._validate_resource(data['id'], 'endorse_resource')

        result = {}
        result['id'] = resource_id

        # Unendorse previously endorsed resource
        if resource_id in self.endorsed_recommendation_ids:
            result['status'] = 'undo endorsement'
            endorsed_index = self.endorsed_recommendation_ids.index(resource_id)
            del self.endorsed_recommendation_ids[endorsed_index]
            del self.endorsed_recommendation_reasons[endorsed_index]
        # Endorse new resource
        else:
            clean_data_reason = strip_and_clean_html_elements(data['reason'])
            result['reason'] = clean_data_reason
            result['status'] = 'endorsement'
            self.endorsed_recommendation_ids.append(resource_id)
            self.endorsed_recommendation_reasons.append(clean_data_reason)

        tracker.emit('endorse_resource', result)
        return result

    @XBlock.json_handler
    def remove_resource(self, data, _suffix=''):
        """
        Remove an entry of resource. This removes it from the student
        view, and prevents students from being able to add it back.

        Args:
                data: dict in JSON format
                data['id']: the ID of the resouce to be removed
                data['reason']: the reason why the resouce was removed
        Returns:
                result: dict in JSON format
                result['error']: the error message generated when the removal fails
                result['recommendation']: (Dict) the removed resource
                result['recommendation']['reason']: the reason why the resouce was removed

        """
        # Auth+auth
        if not self.get_user_is_staff():
            msg = self.ugettext("You don't have the permission to remove this resource")
            self._error_handler(msg, 'remove_resource')

        resource_id = self._validate_resource(data['id'], 'remove_resource')

        # Grab a copy of the resource for the removed list
        # (swli: I reorganized the code a bit. First copy, then delete. This is more fault-tolerant)
        result = {}
        result['id'] = resource_id
        removed_resource = deepcopy(self.recommendations[resource_id])
        removed_resource['reason'] = strip_and_clean_html_elements(data['reason'])

        # Add it to removed resources and remove it from main resource list.
        self.removed_recommendations[resource_id] = removed_resource
        del self.recommendations[resource_id]

        # And return
        result['recommendation'] = removed_resource
        tracker.emit('remove_resource', result)
        return result

    @XBlock.json_handler
    def export_resources(self, _data, _suffix):  # pylint: disable=unused-argument
        """
        Export all resources from the Recommender. This is intentionally not limited to staff
        members (community contributions do not belong to the course staff). Sensitive
        information is exported *is* limited (flagged resources, and in the future, PII if
        any).
        """
        result = {}
        result['export'] = {
            'recommendations': self.recommendations,
            'removed_recommendations': self.removed_recommendations,
            'endorsed_recommendation_ids': self.endorsed_recommendation_ids,
            'endorsed_recommendation_reasons': self.endorsed_recommendation_reasons,
        }
        if self.get_user_is_staff():
            result['export']['flagged_accum_resources'] = self.flagged_accum_resources

        tracker.emit('export_resources', result)
        return result

    @XBlock.handler
    def import_resources(self, request, _suffix=''):
        """
        Import resources into the recommender.
        """
        response = Response()
        response.headers['Content-Type'] = 'application/json'
        if not self.get_user_is_staff():
            response.status = 403
            response.text = json.dumps({'error': self.ugettext('Only staff can import resources')})
            tracker.emit('import_resources', {'Status': 'NOT_A_STAFF'})
            return response

        # Check invalid file types
        file_types = {
            'json': {
                'extension': [".json"],
                'mimetypes': ['application/json', 'text/json', 'text/x-json']
            }
        }
        file_type_error_msg = self.ugettext('Please submit the JSON file obtained with the download resources button')
        result = self._check_upload_file(
            request, file_types, file_type_error_msg, 'import_resources', 31457280
        )
        if isinstance(result, Response):
            return result

        try:
            data = json.load(request.POST['file'].file)

            self.flagged_accum_resources = data['flagged_accum_resources']
            self.endorsed_recommendation_reasons = data['endorsed_recommendation_reasons']
            self.endorsed_recommendation_ids = data['endorsed_recommendation_ids']

            if 'removed_recommendations' in data:
                self.removed_recommendations = data_structure_upgrade(data['removed_recommendations'])
                data['removed_recommendations'] = self.removed_recommendations
            self.recommendations = data_structure_upgrade(data['recommendations'])
            data['recommendations'] = self.recommendations

            tracker.emit('import_resources', {'Status': 'SUCCESS', 'data': data})
            response.text = json.dumps(data, sort_keys=True)
            response.status = 200
            return response
        except (ValueError, KeyError):
            response.status = 415
            response.text = json.dumps(
                {'error': self.ugettext('Please submit the JSON file obtained with the download resources button')}
            )
            tracker.emit('import_resources', {'Status': 'FILE_FORMAT_ERROR'})
            return response
        except IOError:
            return self._raise_pyfs_error('import_resources')

    @XBlock.json_handler
    def accum_flagged_resource(self, _data, _suffix=''):  # pylint: disable=unused-argument
        """
        Accumulate the flagged resource ids and reasons from all students
        """
        if not self.get_user_is_staff():
            msg = self.ugettext('Tried to access flagged resources without staff permission')
            self._error_handler(msg, 'accum_flagged_resource')
        result = {
            'flagged_resources': {}
        }
        for _, flagged_accum_resource_map in six.iteritems(self.flagged_accum_resources):
            for resource_id in flagged_accum_resource_map:
                if resource_id in self.removed_recommendations:
                    continue
                if resource_id not in result['flagged_resources']:
                    result['flagged_resources'][resource_id] = []
                if flagged_accum_resource_map[resource_id] != '':
                    result['flagged_resources'][resource_id].append(flagged_accum_resource_map[resource_id])

        tracker.emit('accum_flagged_resource', result)
        return result

    def student_view(self, _context=None):  # pylint: disable=unused-argument
        """
        The primary view of the RecommenderXBlock, shown to students
        when viewing courses.
        """
        self.recommendations = (
            data_structure_upgrade(self.recommendations) or
            data_structure_upgrade(self.default_recommendations) or
            {}
        )

        # Transition between two versions. In the previous version, there is
        # no endorsed_recommendation_reasons. Thus, we add empty reasons to
        # make the length of the two lists equal
        #
        # TODO: Go through old lists of resources in course, and remove this
        # code. The migration should be done.
        while len(self.endorsed_recommendation_ids) > len(self.endorsed_recommendation_reasons):
            self.endorsed_recommendation_reasons.append('')

        global template_lookup
        if not template_lookup:
            self._init_template_lookup()

        # Ideally, we'd estimate score based on votes, such that items with
        # 1 vote have a sensible ranking (rather than a perfect rating)
        # We pre-generate URLs for all resources. We benchmarked doing this
        # for 44 URLs, and the time per URL was about 8ms. The 44 URLs were
        # all of the images added by students over several problem sets. If
        # load continues to be as-is, pre-generation is not a performance
        # issue. If students make substantially more resources, we may want
        # to paginate, and generate in sets of 5-20 URLs per load.
        resources = [{
                      'id': strip_and_clean_html_elements(r['id']),
                      'title': strip_and_clean_html_elements(r['title']),
                      "votes": strip_and_clean_html_elements(r['upvotes'] - r['downvotes']),
                      'url': strip_and_clean_url(r['url']),
                      'description': self._get_onetime_url(strip_and_clean_html_elements(r['description'])),
                      'descriptionText': strip_and_clean_html_elements(r['descriptionText'])
                      }
                     for r in self.recommendations.values()]
        resources = sorted(resources, key=lambda r: r['votes'], reverse=True)

        frag = Fragment(
            template_lookup.get_template("recommender.html").render(
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
        frag.add_javascript_url('//cdnjs.cloudflare.com/ajax/libs/mustache.js/0.8.1/mustache.min.js')
        frag.add_javascript_url('//cdnjs.cloudflare.com/ajax/libs/intro.js/0.5.0/intro.min.js')
        frag.add_css(self.resource_string("static/css/tooltipster.css"))
        frag.add_css(self.resource_string("static/css/recommender.css"))
        frag.add_css(self.resource_string("static/css/introjs.css"))
        frag.add_javascript(self.resource_string("static/js/src/jquery.tooltipster.min.js"))
        frag.add_javascript(self.resource_string("static/js/src/cats.js"))
        frag.add_javascript(self.resource_string("static/js/src/recommender.js"))
        frag.initialize_js('RecommenderXBlock', self.get_client_configuration())
        return frag

    def studio_view(self, _context=None):  # pylint: disable=unused-argument
        """
        The primary view of the RecommenderXBlock in studio. This is shown to
        course staff when editing a course in studio.
        """
        global template_lookup
        if not template_lookup:
            self._init_template_lookup()

        frag = Fragment(template_lookup.get_template("recommenderstudio.html").render())
        frag.add_css(pkg_resources.resource_string(__name__, "static/css/recommenderstudio.css"))
        frag.add_javascript_url("//ajax.googleapis.com/ajax/libs/jqueryui/1.10.4/jquery-ui.min.js")
        frag.add_javascript(pkg_resources.resource_string(__name__, "static/js/src/recommenderstudio.js"))
        frag.initialize_js('RecommenderXBlock')
        return frag

    def add_xml_to_node(self, node):
        """
        Serialize the XBlock to XML for exporting.
        """
        node.tag = 'recommender'

        node.set('intro_enabled', 'true' if (self.intro_enabled) else 'false')
        node.set('disable_dev_ux', 'true' if (self.client_configuration['disable_dev_ux']) else 'false')
        node.set('entries_per_page', str(self.client_configuration['entries_per_page']))
        node.set('page_span', str(self.client_configuration['page_span']))

        el = etree.SubElement(node, 'resources')
        # Note: The line below does not work in edX platform.
        # We should figure out if the appropriate scope is available during import/export
        # TODO: Talk to Cale
        el.text = json.dumps(self.recommendations).encode("utf-8")

    @staticmethod
    def workbench_scenarios():
        """
        A test sample scenario for display in the workbench.
        """
        return [
            (
                "RecommenderXBlock",
                """
                <vertical_demo>
                    <html_demo><img class="question" src="http://people.csail.mit.edu/swli/edx/recommendation/img/pset.png"></img></html_demo>
                    <recommender intro_enabled="true" disable_dev_ux="true" entries_per_page="2" page_span="1">
                        <resources>
                            [
                                {"id": 1, "title": "Covalent bonding and periodic trends", "upvotes" : 15, "downvotes" : 5, "url" : "https://courses.edx.org/courses/MITx/3.091X/2013_Fall/courseware/SP13_Week_4/SP13_Periodic_Trends_and_Bonding/", "description" : "http://people.csail.mit.edu/swli/edx/recommendation/img/videopage1.png", "descriptionText" : "short description for Covalent bonding and periodic trends"},
                                {"id": 2, "title": "Polar covalent bonds and electronegativity", "upvotes" : 10, "downvotes" : 7, "url" : "https://courses.edx.org/courses/MITx/3.091X/2013_Fall/courseware/SP13_Week_4/SP13_Covalent_Bonding/", "description" : "http://people.csail.mit.edu/swli/edx/recommendation/img/videopage2.png", "descriptionText" : "short description for Polar covalent bonds and electronegativity"},
                                {"id": 3, "title": "Longest wavelength able to to break a C-C bond ...", "upvotes" : 1230, "downvotes" : 7, "url" : "https://answers.yahoo.com/question/index?qid=20081112142253AA1kQN1", "description" : "http://people.csail.mit.edu/swli/edx/recommendation/img/dispage1.png", "descriptionText" : "short description for Longest wavelength able to to break a C-C bond ..."},
                                {"id": 4, "title": "Calculate the maximum wavelength of light for ...", "upvotes" : 10, "downvotes" : 3457, "url" : "https://answers.yahoo.com/question/index?qid=20100110115715AA6toHw", "description" : "http://people.csail.mit.edu/swli/edx/recommendation/img/dispage2.png", "descriptionText" : "short description for Calculate the maximum wavelength of light for ..."},
                                {"id": 5, "title": "Covalent bond - wave mechanical concept", "upvotes" : 10, "downvotes" : 7, "url" : "http://people.csail.mit.edu/swli/edx/recommendation/img/textbookpage1.png", "description" : "http://people.csail.mit.edu/swli/edx/recommendation/img/textbookpage1.png", "descriptionText" : "short description for Covalent bond - wave mechanical concept"},
                                {"id": 6, "title": "Covalent bond - Energetics of covalent bond", "upvotes" : 10, "downvotes" : 7, "url" : "http://people.csail.mit.edu/swli/edx/recommendation/img/textbookpage2.png", "description" : "http://people.csail.mit.edu/swli/edx/recommendation/img/textbookpage2.png", "descriptionText" : "short description for Covalent bond - Energetics of covalent bond"}
                            ]
                        </resources>
                    </recommender>
                    <recommender />
                </vertical_demo>
                """
            ),
        ]

    @classmethod
    def parse_xml(cls, node, runtime, keys, _id_generator):  # pylint: disable=unused-argument
        """
        Parse the XML for the XBlock. It is a list of dictionaries of default recommendations.

        """
        block = runtime.construct_xblock_from_class(cls, keys)
        if node.tag != 'recommender':
            raise UpdateFromXmlError("XML content must contain an 'recommender' root element.")

        if node.get('intro_enabled'):
            block.intro_enabled = (node.get('intro_enabled').lower().strip() not in ['false', '0', ''])

        if node.get('disable_dev_ux'):
            block.client_configuration['disable_dev_ux'] = (node.get('disable_dev_ux').lower().strip() not in ['false', '0', ''])

        for tag in ['entries_per_page', 'page_span']:
            if node.get(tag):
                block.client_configuration[tag] = int(node.get(tag))

        for child in node:
            if child.tag == 'resources' and child.text:
                lines = json.loads(child.text)
                block.default_recommendations = data_structure_upgrade(lines)

        return block


class UpdateFromXmlError(Exception):
    """
    Error occurred while deserializing the TaggedText XBlock content from XML.
    """
    pass


def strip_and_clean_html_elements(data):
    """
    Clean an HTML elements and return it
    """
    return bleach.clean(six.text_type(data), tags=[], strip=True)


def strip_and_clean_url(data):
    """
    Clean an URL elements of HTML tags and possible javascript and return it for use
    Ex of bleach linkify output:
        bleach.linkify('http://google.com') ==> u'<a rel="nofollow" href="http://google.com">http://google.com</a>'
    """
    clean_url = data or ''
    clean_url = stem_url(clean_url)
    clean_url = strip_and_clean_html_elements(clean_url)

    bleach_url = bleach.linkify(clean_url)
    if bleach_url.startswith(u'<a'):
        # The regex pulls out the href value of the generated <a>
        href_url = re.search('href=\"(?P<href>.*?)\"', bleach_url).group('href')
        if href_url == clean_url:
            return href_url

    return ''
