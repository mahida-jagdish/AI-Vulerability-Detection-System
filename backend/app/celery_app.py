from celery import Celery

from app.config import get_settings

settings = get_settings()

celery_app = Celery("exploitronai", broker=settings.redis_url, backend=settings.redis_url)
celery_app.conf.update(
    task_track_started=True,
    task_time_limit=settings.scan_timeout_minutes * 60,
    task_soft_time_limit=(settings.scan_timeout_minutes * 60) - 15,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)
celery_app.conf.imports = ("app.tasks.scan_tasks",)
