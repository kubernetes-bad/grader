{{- define "grader.name" -}}
{{- printf "%s-%s" .Release.Name "app" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "grader.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name -}}
{{- end -}}

{{- define "grader.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "grader.labels" -}}
helm.sh/chart: {{ include "grader.chart" . }}
{{ include "grader.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "grader.selectorLabels" -}}
app.kubernetes.io/name: {{ include "grader.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}