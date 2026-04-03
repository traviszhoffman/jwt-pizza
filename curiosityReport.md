# Curiosity Report: AI And Observability (how AI can be used to sift through metrics and logs to find anomalies and generate appropriate alerts)

## Introduction (Why was I curious?)
I chose **AI and Observability** for my curiosity report because I was especially interested in how AI can be used for obersavbility and reducing the manual toil of looking through logs. I was also interested in it because AI continues to be a concern for me in this career field and I wanted to see how its currently being used in this part of DevOps and in Grafana. I specifaclly in this report explored tools avaible in Grafana i.e. sift, grafana assistant, their llm plugin.

## What is AI powered Observability?
AI powered observability is the process of using machine learning models to automatically analyze metrics, logs, tracces etc. It takes in that data and then looks for patterns that signal problems. Its more than just the static alert thresholds that we've previously set as it determines what is normal for our given system and then flags deviations from when they occur. 

Key points:
- **Anomaly Detection**: AI learns a baseline of normal system behavior and flags deviations automatically.
- **Dynamic Alerting**: Alerts adjust based on learned patterns like time-of-day traffic
- **Root Cause Analysis (RCA)**: AI correlates signals across metrics, logs, and traces to explain why something broke.

## How It Works
1. **Ingest Data**: Metrics, logs, and traces flow into a backend like Prometheus (metrics) or Loki (logs).
2. **Establish Baselines**: ML models analyze historical data to learn the expected range of values, including daily and weekly patterns (seasonality).
3. **Detect Anomalies**: Incoming data is continuously compared against the learned baseline. Anything outside the expected band triggers a flag.
4. **Correlate Signals**: AI links related signals like for example a CPU spike that preceded a slow database query to pinpoint root cause.
5. **Alert or Act**: The system either sends an intelligent alert with context or triggers an automated remediation action like restarting a service or scaling up resources.
6. **Learn from Outcomes**: Feedback loops allow the model to improve over time.

## Why It’s better than Normal Non AI powered Observability
- **Smarter Alerts**: Dynamic thresholds cut down the constant noise of static rules.
- **Faster Investigation**: AI surfaces context about root cause so you spend less time digging.
- **Proactive**: Forecasting catches problems before they become incidents.

## Tools
- **Grafana ML Plugin**: Enables anomaly detection directly on your metrics inside Grafana Cloud.
- **Sift**: Runs automated checks across metrics, logs, and traces when something goes wrong and summarizes findings in plain language.
- **Outlier Detection**

## Pracitcal Application
Using grafana play I was able to explore how AI can be used in Outlier Detection to detect anomalies in advance before problems occur. I tried out Sift on the JWT pizza service but unfortunately wasn't able to find any interesting results based on the data from my application. I plan to rerun a sift investigation after the chaos and pen testing assignments to see if I get better insights from it then.

## What I Think
As I explored AI obersvabilty in Grafana I did take sometime to look at other tools/competitors to Grafana such as DataDog and Dynatrace as well as other small startups that are exploring this problem space. I think Grafana is doing a good job at embracing AI and incorportating it in a way that leverages its capabilities while still being safe and protecting their platform and user data.

## Conclusion
AI anomaly detection/observability in Grafana is a practical upgrade to the monitoring work we already do. By learning what normal looks like, these tools reduce false positives, catch real problems earlier, and give better context when something goes wrong. 