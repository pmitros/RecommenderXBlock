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
 
class HelpResource(dict):
    def __str__(self):
        return json.dumps(self)
    def __init__(s):
        if isinstance(s, str):
            self.update(json.loads(s))
        elif isinstance(s, dict):
            self.update(s)
        else:
            raise TypeError("Inappropriate type "+str(type(s))+" initializing HelpResource. Should be str or dict")
        for e,t in (('id', int), ('title', str), ('url', str), ('upvotes', int), ('downvotes', int), ('description', str)):
            if e not in self:
                raise TypeError("Insufficient fields initializing HelpResource. "+e+" required.")
            if not isinstance(self["e"], t):
                raise TypeError("Incorrect field type initializing HelpResource. "+e+" should be "+str(t)+". It is "+type(self[e]))

    @property
    def title(self):
        return self["title"]
    @title.setter
    def title(self, newtitle):
        self["title"] = newtitle
    @property
    def url(self):
        return self["url"]
    @url.setter
    def url(self, newurl):
        self["url"] = newurl
    @property
    def upvotes(self):
        return self["upvotes"]
    @upvotes.setter
    def upvotes(self, newupvotes):
        self["upvotes"] = newupvotes
    @property
    def downvotes(self):
        return self["downvotes"]
    @downvotes.setter
    def downvotes(self, newdownvotes):
        self["downvotes"] = newdownvotes

class RecommenderXBlock(XBlock):
    """
    This XBlock will show a set of recommended resources
    """
    # Scope-wide. List of JSON objects corresponding to recommendations combine XML and user. 
    default_recommendations = List(help="List of help resources", default=[], scope=Scope.content)
    # Scope-wide. List of JSON objects corresponding to recommendations as defined in XML. 
    recommendations = List(help="List of help resources", default=[], scope=Scope.user_state_summary)
    # Upvotes for this particular user
    upvotes = List(help="List of items user gave upvote to", default=[], scope=Scope.user_state)
    # Downvotes for this particular user
    downvotes = List(help="List of items user gave downvote to", default=[], scope=Scope.user_state)
    # Flag resource id (for problematic resource) for this particular user
    flagId = List(help="List of items user flagged to", default=[], scope=Scope.user_state)
    # Flag resource reason (for problematic resource) for this particular user
    flagReason = List(help="List of reasons of items user flagged to", default=[], scope=Scope.user_state)
    
    template_lookup = None

    def resource_string(self, path):
        """Handy helper for getting resources from our kit."""
        data = pkg_resources.resource_string(__name__, path)
        return data.decode("utf8")

    def getResourceNewId(self):
        recoms = self.recommendations
        if not recoms:
            recoms = self.default_recommendations
        resourceId = -1
        for recom in recoms:
            if recom['id'] > resourceId:
                resourceId = recom['id']
        return resourceId + 1

    def getEntryIndex(self, entryId, entryList):
        for idx in range(0, len(entryList)):
            if entryList[idx]['id'] == entryId:
                return idx
        return -1

    @XBlock.json_handler
    def handle_upvote(self, data, suffix=''):
      ''' untested '''
      resource = data['resource']
      idx = self.getEntryIndex(resource, self.recommendations)
      oldVotes = self.recommendations[idx]['upvotes'] - self.recommendations[idx]['downvotes']
      if resource in self.upvotes:
        del self.upvotes[self.upvotes.index(resource)]
        self.recommendations[idx]['upvotes'] -= 1
        tracker.emit('recommender_upvote', {'id': resource, 'oldVotes': oldVotes, 'newVotes': self.recommendations[idx]['upvotes'] - self.recommendations[idx]['downvotes']})
        print "Upvote unclicked!"
        return {"Success": True}
    
      if resource in self.downvotes:
        del self.downvotes[self.downvotes.index(resource)]
        self.recommendations[idx]['downvotes'] -= 1
      self.upvotes.append(resource)
      self.recommendations[idx]['upvotes'] += 1
      tracker.emit('recommender_upvote', {'id': resource, 'oldVotes': oldVotes, 'newVotes': self.recommendations[idx]['upvotes'] - self.recommendations[idx]['downvotes']})
      print "Upvote clicked!"
      return {"Success": True}

    @XBlock.json_handler
    def handle_downvote(self, data, suffix=''):
      ''' untested '''
      resource = data['resource']
      idx = self.getEntryIndex(resource, self.recommendations)
      oldVotes = self.recommendations[idx]['upvotes'] - self.recommendations[idx]['downvotes']
      if resource in self.downvotes:
        del self.downvotes[self.downvotes.index(resource)]
        self.recommendations[idx]['downvotes'] -= 1
        tracker.emit('recommender_downvote', {'id': resource, 'oldVotes': oldVotes, 'newVotes': self.recommendations[idx]['upvotes'] - self.recommendations[idx]['downvotes']})
        print "Downvote unclicked!"
        return {"Success": True}
    
      if resource in self.upvotes:
        del self.upvotes[self.upvotes.index(resource)]
        self.recommendations[idx]['upvotes'] -= 1
      self.downvotes.append(resource)
      self.recommendations[idx]['downvotes'] += 1
      tracker.emit('recommender_downvote', {'id': resource, 'oldVotes': oldVotes, 'newVotes': self.recommendations[idx]['upvotes'] - self.recommendations[idx]['downvotes']})
      print "Downvote clicked!"
      return {"Success": True}

    @XBlock.handler
    def upload_screenshot(self, request, suffix=''):
        chars=string.ascii_uppercase + string.digits
        size=11
        fileDir = 'uploads/'

        if re.search('.png$', str(request.POST['file'].file)):
            filetype = '.png'
        elif re.search('.jpg$', str(request.POST['file'].file)):
            filetype = '.jpg'
        else:
            tracker.emit('upload_screenshot', {'uploadedFileName': 'FILETYPEERROR'})
            print "Wrong file type"
            response = Response()
            response.body = 'FILETYPEERROR'
            response.headers['Content-Type'] = 'text/plain'
            return response
    
        myS3FS = S3FS('danielswli', aws_access_key=aws_access_key_env, aws_secret_key=aws_secret_key_env)
        while True:
            file_id = ''.join(random.choice(chars) for _ in range(size))
            filename = fileDir + file_id + filetype
            if not myS3FS.exists(filename):
                break
        content = request.POST['file'].file.read()
        fhwrite = myS3FS.open(filename, 'wb')
        fhwrite.write(content)
        fhwrite.close()
        myS3FS.makepublic(filename)

        response = Response()
        response.body = filename
        response.headers['Content-Type'] = 'text/plain'
        tracker.emit('upload_screenshot', {'uploadedFileName': filename})
        return response

    @XBlock.json_handler
    def add_resource(self, data, suffix=''):
        ''' untested '''
        resource = data['resource']
        # Construct new resource
        valid_fields = ['url', 'title', 'description']
        new_resource = {}
        for field in valid_fields:
            new_resource[field] = data['resource'][field]

        # check url for redundancy
        for recom in self.recommendations:
            if recom['url'] == data['resource']['url']:
                print "add redundant resource"
                new_resource['error'] = 'redundant resource'
                tracker.emit('add_resource', new_resource)
                return {"Success": False}

        new_resource['id'] = self.getResourceNewId()
        tracker.emit('add_resource', new_resource)

        new_resource['upvotes'] = 0
        new_resource['downvotes'] = 0
        new_resource['isProblematic'] = "notProblematic"
        new_resource['problematicReason'] = ""
        self.recommendations.append(new_resource)
        return {"Success": True, "id": new_resource['id']}

    @XBlock.json_handler
    def edit_resource(self, data, suffix=''):
        resource = data['resource']
        idx = self.getEntryIndex(resource, self.recommendations)
        if idx not in range(0, len(self.recommendations)):
            print "Edit failed!"
            tracker.emit('edit_resource', {'id': resource, 'error': 'bad id'})
            return {"Success": False}

        valid_fields = ['url', 'title', 'description']
        resource_log = {}
        resource_log['id'] = resource
        for field in valid_fields:
            resource_log['old_' + field] = self.recommendations[idx][field]
            resource_log[field] = data[field]
        # check url for redundancy
        if self.recommendations[idx]['url'] != data['url']:
            for recom in self.recommendations:
                if recom['url'] == data['url']:
                    resource_log['error'] = 'existing url'
                    for field in valid_fields:
                        resource_log['dup_' + field] = self.recommendations[self.recommendations.index(recom)][field]
                    resource_log['dup_id'] = self.recommendations[self.recommendations.index(recom)]['id']
                    print "provided url is existing"
                    tracker.emit('edit_resource', resource_log)
                    return {"Success": False}

        for key in data:
          if key == 'resource':
            continue
          if data[key] == "":
            continue
          self.recommendations[idx][key] = data[key]
        tracker.emit('edit_resource', resource_log)
        return {"Success": True}

    @XBlock.json_handler
    def flag_resource(self, data, suffix=''):
        flagLog = {}
        flagLog['id'] = data['resource']
        flagLog['isProblematic'] = data['isProblematic']
        flagLog['reason'] = data['reason']
        if data['isProblematic'] == True:
            if data['resource'] in self.flagId:
                flagLog['oldReason'] = self.flagReason[self.flagId.index(data['resource'])]
                self.flagReason[self.flagId.index(data['resource'])] = data['reason']
            else:
                self.flagId.append(data['resource'])
                self.flagReason.append(data['reason'])
        else:
            if data['resource'] in self.flagId:
                flagLog['oldReason'] = self.flagReason[self.flagId.index(data['resource'])]
                idx = self.flagId.index(data['resource'])
                del self.flagId[idx]
                del self.flagReason[idx]
        tracker.emit('flag_resource', flagLog)
        return {"Success": True}

    # TO-DO: change this view to display your data your own way.
    def student_view(self, context=None):
        """
        The primary view of the RecommenderXBlock, shown to students
        when viewing courses.
        """
        print "entered"
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
        resources = [{'id' : r['id'], 'title' : r['title'], "votes" : r['upvotes'] - r['downvotes'], 'url' : r['url'], 'description' : r['description']} for r in self.recommendations]
        resources = sorted(resources, key = lambda r: r['votes'], reverse=True)

        frag = Fragment(self.template_lookup.get_template("recommender.html").render(resources = resources, upvotes = self.upvotes, downvotes = self.downvotes, flagId = self.flagId, flagReason = self.flagReason))
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
                     {"id": 1, "title": "Covalent bonding and periodic trends", "upvotes" : 15, "downvotes" : 5, "url" : "https://courses.edx.org/courses/MITx/3.091X/2013_Fall/courseware/SP13_Week_4/SP13_Periodic_Trends_and_Bonding/", "description" : "http://people.csail.mit.edu/swli/edx/recommendation/img/videopage1.png"}
                     {"id": 2, "title": "Polar covalent bonds and electronegativity", "upvotes" : 10, "downvotes" : 7, "url" : "https://courses.edx.org/courses/MITx/3.091X/2013_Fall/courseware/SP13_Week_4/SP13_Covalent_Bonding/", "description" : "http://people.csail.mit.edu/swli/edx/recommendation/img/videopage2.png"}
                     {"id": 3, "title": "Longest wavelength able to to break a C-C bond ...", "upvotes" : 1230, "downvotes" : 7, "url" : "https://answers.yahoo.com/question/index?qid=20081112142253AA1kQN1", "description" : "http://people.csail.mit.edu/swli/edx/recommendation/img/dispage1.png"}
                     {"id": 4, "title": "Calculate the maximum wavelength of light for ...", "upvotes" : 10, "downvotes" : 3457, "url" : "https://answers.yahoo.com/question/index?qid=20100110115715AA6toHw", "description" : "http://people.csail.mit.edu/swli/edx/recommendation/img/dispage2.png"}
                  </recommender>
                </vertical_demo>
             """),
#                     {"id": 5, "title": "Covalent bond - wave mechanical concep", "upvotes" : 10, "downvotes" : 7, "url" : "", "description" : "http://people.csail.mit.edu/swli/edx/recommendation/img/textbookpage1.png", "isProblematic": "notProblematic"}
#                     {"id": 6, "title": "Covalent bond - Energetics of covalent bond", "upvotes" : 10, "downvotes" : 7, "url" : "", "description" : "http://people.csail.mit.edu/swli/edx/recommendation/img/textbookpage2.png", "isProblematic": "notProblematic"}
#                  </recommender>
#                </vertical_demo>
#             """),
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
                print "Decoding", line
                lines.append(json.loads(line))
    
        block.default_recommendations = lines
        return block
