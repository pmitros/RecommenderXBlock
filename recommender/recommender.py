"""TO-DO: Write a description of what this XBlock is."""

import pkg_resources

from xblock.core import XBlock
from xblock.fields import Scope, Integer, String
from xblock.fragment import Fragment


class RecommenderXBlock(XBlock):
    """
    This XBlock will play an MP3 file as an HTML5 recommender element. 
    """

    # Fields are defined on the class.  You can access them in your code as
    # self.<fieldname>.
    src = String(
           scope = Scope.settings, 
           help = "URL for MP3 file to play"
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
        print self.src
        print html.format
        frag = Fragment(html.format(src = self.src))
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
                  <recommender src="http://localhost/Ikea.mp3"> </recommender>
                  <recommender src="http://localhost/skull.mp3"> </recommender>
                  <recommender src="http://localhost/monkey.mp3"> </recommender>
                </vertical_demo>
             """),
        ]
