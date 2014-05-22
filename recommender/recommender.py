"""TO-DO: Write a description of what this XBlock is."""

import pkg_resources

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

    # Fields are defined on the class.  You can access them in your code as
    # self.<fieldname>.
    objects = List(
           scope = BlockScope, 
           help = "List of help resources"
        )

    def resource_string(self, path):
        """Handy helper for getting resources from our kit."""
        data = pkg_resources.resource_string(__name__, path)
        return data.decode("utf8")

    # TO-DO: change this view to display your data your own way.
    def student_view(self, context=None):
        """
        The primary view of the RecommenderXBlock, shown to students
        when viewing courses.
        """
        html = self.resource_string("static/html/recommender.html")
        print html.format
        frag = Fragment(html.format())
        frag.add_css_url("//ajax.googleapis.com/ajax/libs/jqueryui/1.10.4/themes/smoothness/jquery-ui.css")
        frag.add_javascript_url("//ajax.googleapis.com/ajax/libs/jqueryui/1.10.4/jquery-ui.min.js")
        frag.add_css(self.resource_string("static/css/recommender.css"))
        frag.add_javascript(self.resource_string("static/js/src/recommender.js"))
        frag.initialize_js('RecommenderXBlock')
        print self.xml_text_content()
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
                     
                  </recommender>
                  <recommender> 
                  </recommender>
                </vertical_demo>
             """),
        ]
