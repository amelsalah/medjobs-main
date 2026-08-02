# medjobs/fetch_jobs.py
import requests
from datetime import datetime
from medjobs.models import Job

TIMEOUT = 30

def _parse_posted_date(v):
    if not v:
        return None
    # Oracle sometimes returns 'YYYY-MM-DD' or ISO datetime
    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f"):
        try:
            return datetime.strptime(v[:len(fmt)], fmt).date()
        except Exception:
            pass
    return None

def fetch_oracle_ce_no_constraints(*, source_prefix, base_url, site_number, hospital_name, limit=50, max_jobs=2000, stdout=None, stderr=None):
    """
    Fetch ALL published jobs from Oracle Candidate Experience without facet constraints.
    Uses finder=findReqs;siteNumber=...,limit=...,offset=...,sortBy=...
    """
    def out(msg): stdout.write(msg) if stdout else print(msg)
    def err(msg): stderr.write(msg) if stderr else print(msg)

    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
    }

    total = 0
    session = requests.Session()

    for offset in range(0, max_jobs, limit):
        params = {
            "onlyData": "true",
            "expand": "requisitionList.workLocation,requisitionList.requisitionFlexFields",
            # ✅ NO facetsList / NO selectedPostingDatesFacet / NO selectedLocationsFacet
            "finder": f"findReqs;siteNumber={site_number},limit={limit},offset={offset},sortBy=POSTING_DATES_DESC",
        }

        try:
            r = session.get(base_url, params=params, headers=headers, timeout=TIMEOUT)
        except requests.RequestException as e:
            err(f"{source_prefix.upper()} request failed: {e}")
            break

        if r.status_code != 200:
            err(f"{source_prefix.upper()} API {r.status_code}: {r.text[:300]}")
            break

        data = r.json()
        items = data.get("items", []) or []

        # Robustly gather requisitions from all items
        reqs = []
        for it in items:
            reqs.extend(it.get("requisitionList", []) or [])

        if not reqs:
            break

        for j in reqs:
            jid = j.get("Id")
            if not jid:
                continue

            external_id = f"{source_prefix}-{jid}"  # ✅ prevents duplicates across sources
            job_url = f"{base_url.split('/hcmRestApi')[0]}/hcmUI/CandidateExperience/en/sites/{site_number}/requisitions/preview/{jid}"

            Job.objects.update_or_create(
                external_id=external_id,
                defaults={
                    "title": j.get("Title", "") or "",
                    "location": j.get("PrimaryLocation", "") or "",
                    "hospital_name": hospital_name,
                    "posted_date": _parse_posted_date(j.get("PostedDate")),
                    "job_url": job_url,
                }
            )
            total += 1
            if total >= max_jobs:
                break

        if total >= max_jobs:
            break

        # if fewer than limit returned, likely last page
        if len(reqs) < limit:
            break

    out(f"✅ {hospital_name}: Imported/Updated {total}")
    return total

    def fetch_seha(self, limit=50, max_jobs=1000):
        return self._oracle_fetch(
            source_key="seha",
            base_url="https://fa-eutv-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions",
            site_number="CX_1",
            preview_site_path="CX_1",
            finder_extras="selectedLocationsFacet=300000000446183,",
            limit=limit,
            max_jobs=max_jobs
        )

    def fetch_nmc(self, limit=50, max_jobs=1000):
        return self._oracle_fetch(
            source_key="nmc",
            base_url="https://eiby.fa.em2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions",
            site_number="CX_1",
            preview_site_path="CX_1",
            finder_extras="selectedLocationsFacet=300000000289054,",
            limit=limit,
            max_jobs=max_jobs
        )

    def fetch_skmc(self, limit=50, max_jobs=1000):
        return self._oracle_fetch(
            source_key="skmc",
            base_url="https://fa-exqb-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions",
            site_number="CX_1003",
            preview_site_path="CX_1003",
            finder_extras="",
            limit=limit,
            max_jobs=max_jobs
        )

    def fetch_aster(self, limit=50, max_jobs=1000):
        # keep your prefix logic, just route through helper
        return self._oracle_fetch(
            source_key="aster",
            base_url="https://hcdtgccprod-iayeqy.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions",
            site_number="CX",
            preview_site_path="CX",
            finder_extras="selectedLocationsFacet=300000000254942,",
            limit=limit,
            max_jobs=max_jobs
        )

    def fetch_american_hospital(self, limit=50, max_jobs=500):
        return self._oracle_fetch(
            source_key="american",
            base_url="https://fa-epvs-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions",
            site_number="CX_1",
            preview_site_path="CX_1",
            finder_extras="",
            limit=limit,
            max_jobs=max_jobs
        )

    def fetch_burjeel(self, max_jobs=100):
        self.stdout.write("Fetching Burjeel jobs (scrape)...")
        url = "https://burjeel.com/careers/"

        try:
            r = requests.get(url, timeout=self.TIMEOUT)
        except requests.RequestException as e:
            self.stderr.write(f"Burjeel request failed: {e}")
            return 0

        if r.status_code != 200:
            self.stderr.write(f"Burjeel page not reachable: {r.status_code}")
            return 0

        soup = BeautifulSoup(r.text, "html.parser")

        # NOTE: selectors may change; if count=0 we’ll log it clearly.
        job_elems = soup.select(".current-openings .job-card")
        if not job_elems:
            self.stderr.write("Burjeel: selector returned 0 jobs. Site HTML likely changed.")
            return 0

        count = 0
        for elem in job_elems[:max_jobs]:
            title_el = elem.select_one(".job-title")
            title = title_el.get_text(strip=True) if title_el else "Job Opening"

            loc_el = elem.select_one(".location")
            location = loc_el.get_text(strip=True) if loc_el else "UAE"

            date_el = elem.select_one(".date-posted")
            posted_date = None
            if date_el:
                posted_date = self._parse_posted_date(date_el.get_text(strip=True))

            a = elem.select_one("a[href]")
            job_url = a["href"].strip() if a else url
            if job_url.startswith("/"):
                job_url = "https://burjeel.com" + job_url

            external_id = f"burjeel:{job_url}"

            Job.objects.update_or_create(
                external_id=external_id,
                defaults={
                    "title": title,
                    "location": location,
                    "hospital_name": "Burjeel",
                    "posted_date": posted_date,
                    "job_url": job_url,
                }
            )
            count += 1

        self.stdout.write(self.style.SUCCESS(f"Imported/Updated {count} Burjeel jobs (scrape)"))
        return count

    def handle(self, *args, **options):
        total = 0
        total += self.fetch_seha()
        total += self.fetch_nmc()
        total += self.fetch_burjeel()
        total += self.fetch_skmc()
        total += self.fetch_aster()
        total += self.fetch_american_hospital()

        self.stdout.write(self.style.SUCCESS(f"Imported/Updated {total} jobs total"))
# medjobs/fetch_jobs.py
from datetime import datetime
import requests
from bs4 import BeautifulSoup

from medjobs.models import Job

def run_sync(stdout=None, stderr=None):
    total = 0

    # SEHA (site CX_1) :contentReference[oaicite:5]{index=5}
    total += fetch_oracle_ce_no_constraints(
        source_prefix="seha",
        base_url="https://fa-eutv-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions",
        site_number="CX_1",
        hospital_name="SEHA",
        stdout=stdout, stderr=stderr
    )

    # NMC: try CX_1001 and CX_1 (both exist publicly) :contentReference[oaicite:6]{index=6}
    total += fetch_oracle_ce_no_constraints(
        source_prefix="nmc1001",
        base_url="https://eiby.fa.em2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions",
        site_number="CX_1001",
        hospital_name="NMC (CX_1001)",
        stdout=stdout, stderr=stderr
    )
    total += fetch_oracle_ce_no_constraints(
        source_prefix="nmc1",
        base_url="https://eiby.fa.em2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions",
        site_number="CX_1",
        hospital_name="NMC (CX_1)",
        stdout=stdout, stderr=stderr
    )

    # SKMC (site CX_1003) :contentReference[oaicite:7]{index=7}
    total += fetch_oracle_ce_no_constraints(
        source_prefix="skmc",
        base_url="https://fa-exqb-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions",
        site_number="CX_1003",
        hospital_name="Sheikh Khalifa Medical City",
        stdout=stdout, stderr=stderr
    )

    # Aster (site CX) :contentReference[oaicite:8]{index=8}
    total += fetch_oracle_ce_no_constraints(
        source_prefix="aster",
        base_url="https://hcdtgccprod-iayeqy.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions",
        site_number="CX",
        hospital_name="Aster",
        stdout=stdout, stderr=stderr
    )

    if stdout:
        stdout.write(f"✅ Imported/Updated {total} jobs total")
    else:
        print(f"✅ Imported/Updated {total} jobs total")

    return total
