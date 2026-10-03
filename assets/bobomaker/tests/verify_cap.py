"""Compatibility entry point for the fitted-headwear regression suite.

The old cap pixel-preservation target was superseded by the smaller fit.
Checks now include tucked ears and both layer export formats.
"""
import runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).with_name('verify_headwear.py')),run_name='__main__')
