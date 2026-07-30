import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import Icon from "./Icon";
import JobRow from "./JobRow";
import { cardCls, cardTitleCls } from "../lib/ui";

function PrintQueue({ refreshKey, onStatus }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [armed, setArmed] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  const requestRefresh = () => {
    setLoading(true);
    setTick((t) => t + 1);
  };

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await invoke("list_print_jobs");
        if (!cancelled) setJobs(result);
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tick, refreshKey]);

  const handleCancel = async (jobRef) => {
    setArmed(null);
    setCancelling(jobRef);
    try {
      const result = await invoke("cancel_job", { jobRef });
      onStatus({ msg: result, type: "success" });
    } catch (err) {
      onStatus({ msg: `Cancel failed: ${err}`, type: "error" });
    } finally {
      setCancelling(null);
      requestRefresh();
    }
  };

  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between mb-3">
        <span className={cardTitleCls}>Print Queue</span>
        <button
          onClick={requestRefresh}
          className="text-[11px] text-neutral-400 hover:text-neutral-600 transition-colors flex items-center gap-1"
        >
          <Icon
            name="refresh"
            className={`w-3 h-3 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-neutral-200 rounded">
          <p className="text-xs text-neutral-400">No active print jobs</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {jobs.map((job) => (
            <JobRow
              key={job.job_ref}
              job={job}
              isCancelling={cancelling === job.job_ref}
              isArmed={armed === job.job_ref}
              onArm={() => setArmed(job.job_ref)}
              onDismiss={() => setArmed(null)}
              onCancel={() => handleCancel(job.job_ref)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default PrintQueue;
