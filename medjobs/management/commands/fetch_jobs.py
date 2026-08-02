from django.core.management.base import BaseCommand
from medjobs.fetch_jobs import run_sync

class Command(BaseCommand):
    help = "Fetch jobs and update DB"

    def handle(self, *args, **options):
        run_sync(stdout=self.stdout, stderr=self.stderr)
