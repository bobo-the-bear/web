"""Compatibility entry point for the fitted-headwear regression suite.

The former cap is now replaced by the fitted Pump.fun trucker.
Checks include legacy selection mapping, ear handling and both layer exports.
"""
import runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).with_name('verify_headwear.py')),run_name='__main__')
