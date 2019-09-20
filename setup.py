"""Setup for recommender XBlock."""

from __future__ import absolute_import
import os
import subprocess
from setuptools.command.install import install as _install
from setuptools import setup

base_path = os.path.dirname(__file__)
README = open(os.path.join(base_path, "README.rst")).read()


class XBlockInstall(_install):
    """Custom XBlock install command."""

    def run(self):
        _install.run(self)
        self.compile_translations()

    def compile_translations(self):
        """
        Compiles textual translations files(.po) to binary(.mo) files.
        """
        self.announce('Compiling translations')
        try:
            for dirname, _, files in os.walk(os.path.join('recommender', 'translations')):
                for fname in files:
                    if os.path.splitext(fname)[1] == '.po':
                        po_path = os.path.join(dirname, fname)
                        mo_path = os.path.splitext(po_path)[0] + '.mo'
                        self.announce('Compiling translation at %s' % po_path)
                        subprocess.check_call(['msgfmt', po_path, '-o', mo_path], cwd=self.install_lib)
        except Exception as ex:
            self.announce('Translations compilation failed: %s' % ex.message)


def package_data(pkg, root_list):
    """Generic function to find package_data for `pkg` under `root`."""
    data = []
    for root in root_list:
        for dirname, _, files in os.walk(os.path.join(pkg, root)):
            for fname in files:
                data.append(os.path.relpath(os.path.join(dirname, fname), pkg))

    return {pkg: data}


setup(
    name='recommender-xblock',
    version='1.4.2',
    description='recommender XBlock',   # TODO: write a better description.
    long_description=README,
    author='edX',
    author_email='oscm@edx.org',
    url='https://github.com/edx/RecommenderXBlock',
    packages=[
        'recommender',
    ],
    license='AGPL 3.0',
    entry_points={
        'xblock.v1': [
            'recommender = recommender:RecommenderXBlock',
        ]
    },
    package_data=package_data("recommender", ["static", "translations"]),
    cmdclass={
        'install': XBlockInstall,
    },
    keywords="Django edx",
    classifiers=[
        "Development Status :: 4 - Beta",
        "Framework :: Django",
        "Framework :: Django :: 1.8",
        "Framework :: Django :: 1.9",
        "Framework :: Django :: 1.10",
        "Framework :: Django :: 1.11",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: GNU Affero General Public License v3 or later (AGPLv3+)",
        "Natural Language :: English",
        "Programming Language :: Python :: 2",
        "Programming Language :: Python :: 2.7",
        'Programming Language :: Python :: 3.5',
        'Programming Language :: Python :: 3.6',
    ],
)
