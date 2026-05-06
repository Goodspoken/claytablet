"""
conftest.py — Set up test environment before any test module imports.
This runs BEFORE test_api.py is collected, ensuring DATA_DIR is set correctly.
"""
import os
import shutil

# Must be set before any backend module import
TEST_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "test_data")
os.environ["DATA_DIR"] = TEST_DATA_DIR

# Pre-create the directory so database.py module-level code doesn't fail
if os.path.exists(TEST_DATA_DIR):
    shutil.rmtree(TEST_DATA_DIR)
os.makedirs(TEST_DATA_DIR, exist_ok=True)
os.makedirs(os.path.join(TEST_DATA_DIR, "media"), exist_ok=True)
