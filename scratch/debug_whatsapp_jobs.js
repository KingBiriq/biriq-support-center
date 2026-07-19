const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("Checking support_whatsapp_forward_jobs...");
  const { data: jobs, error } = await s.from('support_whatsapp_forward_jobs').select('*');
  if (error) {
    console.error("Error fetching jobs:", error);
    return;
  }
  console.log(`Total jobs found: ${jobs.length}`);
  const statusCounts = {};
  jobs.forEach(j => {
    statusCounts[j.status] = (statusCounts[j.status] || 0) + 1;
  });
  console.log("Job status counts:", statusCounts);

  const failedJobs = jobs.filter(j => j.status === 'failed' || j.status === 'dead_letter');
  if (failedJobs.length > 0) {
    console.log(`Resetting ${failedJobs.length} failed/dead_letter jobs to 'pending'...`);
    const { error: updateError } = await s
      .from('support_whatsapp_forward_jobs')
      .update({ status: 'pending', attempts: 0, next_retry_at: new Date().toISOString() })
      .in('id', failedJobs.map(j => j.id));
    
    if (updateError) {
      console.error("Error updating jobs:", updateError);
    } else {
      console.log("Jobs successfully reset to pending!");
    }
  } else {
    console.log("No failed jobs to reset.");
  }
}

run();
