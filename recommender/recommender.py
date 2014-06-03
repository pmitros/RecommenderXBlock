"""TO-DO: Write a description of what this XBlock is."""

import json

import pkg_resources
from mako.template import Template
from mako.lookup import TemplateLookup


from xblock.core import XBlock
from xblock.fields import Scope, Integer, String, BlockScope, List
from xblock.fragment import Fragment

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
        for e,t in (('title', str), ('url', str), ('upvotes', int), ('downvotes', int)):
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
    recommendations = List(help="List of help resources", default=[], scope=Scope.content)
    # Upvotes for this particular user
    upvotes = List(help="List of items user gave upvote to", default=[], scope=Scope.user_state)
    # Downvotes for this particular user
    downvotes = List(help="List of items user gave downvote to", default=[], scope=Scope.user_state)

    template_lookup = None

    def resource_string(self, path):
        """Handy helper for getting resources from our kit."""
        data = pkg_resources.resource_string(__name__, path)
        return data.decode("utf8")

    @XBlock.json_handler
    def handle_upvote(self, data, suffix=''):
        ''' untested '''
        resource = data['resource']
        if resource in upvotes:
            return {"Success": False}

        if resource in self.downvotes:
            del self.downvotes[self.downvotes.index(resource)]
            self.recommendations[resource]['downvotes'] -= 1

        self.upvotes.append(resource)
        self.recommendations[resource]['upvotes'] += 1

        print "Upvote clicked!"
        return {"Success": True}

    @XBlock.json_handler
    def add_resource(self, data, suffix=''):
        ''' untested '''
        resource = data['resource']
        
        ## TODO: Return if already in resources
        # Construct new resource
        valid_fields = ['url', 'title', 'description']
        new_resource = {}
        for field in valid_fields:
            new_resource[field] = data['resource'][field]
        new_resource['upvotes'] = 0
        new_resource['downvotes'] = 0
        self.resources.append(new_resource)
        return {"Success": True}

    @XBlock.json_handler
    def edit_resource(self, data, suffix=''):
        pass

    @XBlock.json_handler
    def flag_resource(self, data, suffix=''):
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

        if not self.template_lookup:
            self.template_lookup = TemplateLookup() 
            self.template_lookup.put_string("recommender.html", self.resource_string("static/html/recommender.html"))
            self.template_lookup.put_string("resourcebox.html", self.resource_string("static/html/resourcebox.html"))

        resources = [{'title' : r['title'], "votes" : r['up'] - r['down']} for r in self.recommendations]
        # TODO: Sort by votes
        # Ideally, we'd estimate score based on votes, such that items with 1 vote have a sensible ranking (rather than a perfect rating)
        # 

        frag = Fragment(self.template_lookup.get_template("recommender.html").render(resources = resources))
        frag.add_css_url("//ajax.googleapis.com/ajax/libs/jqueryui/1.10.4/themes/smoothness/jquery-ui.css")
        frag.add_javascript_url("//ajax.googleapis.com/ajax/libs/jqueryui/1.10.4/jquery-ui.min.js")
        frag.add_css(self.resource_string("static/css/recommender.css"))
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
                  <recommender> 
                     {"title": "Textbook page 501", "up" : 50, "down" : 75, "url" : "google.com"}
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
                print "Decoding", line
                lines.append(json.loads(line))
    
        block.default_recommendations = lines
        return block
