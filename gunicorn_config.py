# Gunicorn configuration file
import multiprocessing
import os

# Server socket
bind = f"0.0.0.0:{os.environ.get('PORT', '5000')}"

# Worker processes
workers = 2  # Use 2 workers for better reliability
worker_class = 'sync'
worker_connections = 1000

# Timeouts
timeout = 120  # Increase to 120 seconds for data loading
graceful_timeout = 30
keepalive = 5

# Logging
accesslog = '-'
errorlog = '-'
loglevel = 'info'

# Process naming
proc_name = 'cinematch'

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# Memory management
max_requests = 1000  # Restart workers after 1000 requests to prevent memory leaks
max_requests_jitter = 50

# Preload app for faster startup
preload_app = True

def on_starting(server):
    """Called just before the master process is initialized."""
    print("="*50)
    print("Starting CineMatch server...")
    print(f"Workers: {workers}")
    print(f"Timeout: {timeout}s")
    print("="*50)

def when_ready(server):
    """Called just after the server is started."""
    print("Server is ready. Accepting connections.")

def on_exit(server):
    """Called just before exiting gunicorn."""
    print("Shutting down CineMatch server...")
