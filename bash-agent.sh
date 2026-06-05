#!/usr/bin/env bash
# =============================================================================
# MASTER BASH AGENT SYSTEM v1.0
# Built by RJ Business Solutions | rickjeffersonsolutions.com
# Bash Version: 5.3 | GNU Manual Reference: gnu.org/software/bash/manual/bash.html
# Date: March 19, 2026
# =============================================================================
# PURPOSE:
#   A fully self-contained interactive Bash agent that:
#   1. Knows EVERYTHING about Bash 5.3 (all builtins, expansions, features)
#   2. Takes ANY user project blueprint request
#   3. Generates a complete, production-ready, annotated Bash script for it
#   4. Guides the user through setup step by step
# =============================================================================

# ─────────────────────────────────────────────────────────────────────────────
# LAYER 0: STRICT MODE + GLOBAL SAFETY NET
# Source: GNU Bash Manual §3.7.5 Exit Status + §4.3.1 The Set Builtin
# -e  → exit immediately on error
# -u  → treat unset variables as errors (prevents silent bugs)
# -o pipefail → catch failures in pipelines, not just last command
# -E  → ERR traps inherited by functions and subshells
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
set -E

# ─────────────────────────────────────────────────────────────────────────────
# LAYER 1: GLOBAL CONSTANTS + COLORS
# Source: GNU Bash Manual §3.4 Shell Parameters + ANSI-C Quoting §3.1.2.4
# ─────────────────────────────────────────────────────────────────────────────
readonly AGENT_NAME="MASTER BASH AGENT"
readonly AGENT_VERSION="1.0"
readonly AGENT_DATE="March 19, 2026"
readonly COMPANY="RJ Business Solutions"
readonly WEBSITE="rickjeffersonsolutions.com"
readonly OUTPUT_DIR="${HOME}/bash-agent-output"
readonly LOG_FILE="${OUTPUT_DIR}/agent.log"
readonly TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

# ANSI color codes — $'...' is ANSI-C quoting (GNU Manual §3.1.2.4)
readonly RED=$'\033[0;31m'
readonly GREEN=$'\033[0;32m'
readonly YELLOW=$'\033[1;33m'
readonly CYAN=$'\033[0;36m'
readonly MAGENTA=$'\033[0;35m'
readonly BLUE=$'\033[0;34m'
readonly BOLD=$'\033[1m'
readonly DIM=$'\033[2m'
readonly RESET=$'\033[0m'
readonly CHECKMARK="${GREEN}✅${RESET}"
readonly ARROW="${CYAN}→${RESET}"
readonly FIRE="${YELLOW}🔥${RESET}"
readonly ROBOT="${MAGENTA}🤖${RESET}"

# ─────────────────────────────────────────────────────────────────────────────
# LAYER 2: TRAP SYSTEM — GLOBAL ERROR HANDLER + CLEANUP
# Source: GNU Bash Manual §3.7.6 Signals + §4.1 Bourne Shell Builtins (trap)
# Traps: ERR fires on any error, EXIT always fires, INT fires on Ctrl+C
# ─────────────────────────────────────────────────────────────────────────────

# Cleanup function — always runs at exit
cleanup() {
  local exit_code=$?
  if [[ ${exit_code} -ne 0 ]]; then
    log_error "Agent exited with code ${exit_code}"
    echo -e "\n${RED}${BOLD}[AGENT ERROR]${RESET} Something went wrong. Check ${LOG_FILE}"
  fi
  # Kill any background jobs started by this script
  # GNU Manual §7.1 Job Control Basics — jobs -p lists all PIDs
  jobs -p | xargs -r kill 2>/dev/null || true
}

# Error handler — fires on any command failure when set -E is active
error_handler() {
  local line_number=$1
  local command=$2
  local exit_code=$3
  log_error "Command failed at line ${line_number}: '${command}' (exit code: ${exit_code})"
  echo -e "${RED}[ERR line ${line_number}]${RESET} Command '${BOLD}${command}${RESET}' failed (exit ${exit_code})"
}

# Register all traps
trap 'cleanup' EXIT
trap 'error_handler ${LINENO} "${BASH_COMMAND}" $?' ERR
trap 'echo -e "\n${YELLOW}[AGENT]${RESET} Interrupted by user. Goodbye Rick! 👋"; exit 0' INT TERM

# ─────────────────────────────────────────────────────────────────────────────
# LAYER 3: LOGGING ENGINE
# Source: GNU Bash Manual §3.6 Redirections — >> append, 2>&1 stderr redirect
# ─────────────────────────────────────────────────────────────────────────────

# Initialize log directory + file
init_logging() {
  mkdir -p "${OUTPUT_DIR}"
  # Redirect: >> appends, tee duplicates to stdout — GNU Manual §3.6.3
  echo "=== ${AGENT_NAME} v${AGENT_VERSION} | ${TIMESTAMP} ===" >> "${LOG_FILE}"
}

log_info()    { echo -e "[$(date '+%H:%M:%S')] [INFO]  $*" >> "${LOG_FILE}"; }
log_success() { echo -e "[$(date '+%H:%M:%S')] [OK]    $*" >> "${LOG_FILE}"; }
log_error()   { echo -e "[$(date '+%H:%M:%S')] [ERROR] $*" >> "${LOG_FILE}"; }
log_debug()   { echo -e "[$(date '+%H:%M:%S')] [DEBUG] $*" >> "${LOG_FILE}"; }

# ─────────────────────────────────────────────────────────────────────────────
# LAYER 4: UI FUNCTIONS — PRETTY TERMINAL OUTPUT
# Source: GNU Bash Manual §6.9 Controlling the Prompt + §4.2 Bash Builtins (printf)
# printf is preferred over echo for portability — GNU Manual §4.2
# ─────────────────────────────────────────────────────────────────────────────

print_banner() {
  # Here-document (heredoc) — GNU Manual §3.6.6
  cat << BANNER
${CYAN}${BOLD}
╔══════════════════════════════════════════════════════════════════╗
║        🤖  MASTER BASH AGENT SYSTEM  v${AGENT_VERSION}              ║
║        🔥  Every Bash 5.3 Feature. Zero Limits.                  ║
║        🏢  ${COMPANY}                              ║
║        🌐  ${WEBSITE}                       ║
║        📅  ${AGENT_DATE}                              ║
╚══════════════════════════════════════════════════════════════════╝
${RESET}
BANNER
}

print_section() {
  # Parameter expansion — GNU Manual §3.5.3
  local title="${1:-Section}"
  echo -e "\n${CYAN}${BOLD}━━━  ${title^^}  ━━━${RESET}\n"
}

print_success() { echo -e "${CHECKMARK} ${GREEN}${1}${RESET}"; }
print_info()    { echo -e "${ARROW} ${1}"; }
print_warn()    { echo -e "${YELLOW}⚠️  ${1}${RESET}"; }
print_error()   { echo -e "${RED}❌ ${1}${RESET}"; }
print_step()    { echo -e "${BOLD}[STEP ${1}]${RESET} ${2}"; }

# ─────────────────────────────────────────────────────────────────────────────
# LAYER 5: BASH 5.3 KNOWLEDGE ENGINE
# Associative array storing ALL Bash features — GNU Manual §6.7 Arrays
# Associative arrays declared with declare -A — GNU Manual §6.7
# ─────────────────────────────────────────────────────────────────────────────

declare -A BASH_KNOWLEDGE
declare -A BASH_BUILTINS
declare -A BASH_SPECIAL_VARS
declare -A PROJECT_TEMPLATES
declare -A SETUP_RECIPES

# ── Populate Knowledge Base: Core Bash 5.3 Features ──
load_knowledge_base() {
  # Array assignments — GNU Manual §6.7
  BASH_KNOWLEDGE=(
    [strict_mode]='set -euo pipefail; set -E'
    [shebang]='#!/usr/bin/env bash'
    [arrays]='declare -a arr=("a" "b" "c"); echo "${arr[@]}"; echo "${#arr[@]}"'
    [assoc_arrays]='declare -A map=([key]="val"); echo "${map[key]}"; echo "${!map[@]}"'
    [param_default]='${VAR:-default}  # use default if VAR unset or empty'
    [param_assign]='${VAR:=default}  # assign default if VAR unset or empty'
    [param_error]='${VAR:?error msg}  # exit with error if VAR unset'
    [param_alt]='${VAR:+alternate}  # use alternate if VAR is SET'
    [param_length]='${#VAR}  # length of string or array'
    [param_slice]='${VAR:offset:length}  # substring extraction'
    [param_upper]='${VAR^^}  # uppercase all (Bash 4+)'
    [param_lower]='${VAR,,}  # lowercase all (Bash 4+)'
    [param_replace]='${VAR/pattern/replacement}  # replace first match'
    [param_replace_all]='${VAR//pattern/replacement}  # replace all matches'
    [param_strip_prefix]='${VAR#prefix}  # strip shortest prefix match'
    [param_strip_prefix_long]='${VAR##prefix}  # strip longest prefix match'
    [param_strip_suffix]='${VAR%suffix}  # strip shortest suffix match'
    [param_strip_suffix_long]='${VAR%%suffix}  # strip longest suffix match'
    [cmd_substitution]='result=$(command)  # preferred over backticks'
    [arithmetic]='$(( expr ))  # arithmetic expansion'
    [process_sub]='diff <(cmd1) <(cmd2)  # process substitution'
    [brace_expansion]='echo {a,b,c} or {1..10} or {01..10}'
    [here_doc]='cat << EOF ... EOF  # heredoc'
    [here_string]='grep "pattern" <<< "$variable"  # here-string'
    [coprocess]='coproc NAME { command; }  # bidirectional pipe'
    [regex_match]='[[ "$str" =~ ^[0-9]+$ ]]  # regex with =~'
    [glob_extended]='shopt -s extglob; *(pattern) +(pattern)'
    [nullglob]='shopt -s nullglob  # globs return empty not literal'
    [globstar]='shopt -s globstar; ls **/*.sh  # recursive glob'
    [pipefail]='set -o pipefail  # catch pipe failures'
    [errexit]='set -e  # exit on error'
    [nounset]='set -u  # error on unset vars'
    [lastpipe]='shopt -s lastpipe  # last pipe runs in current shell'
    [local_vars]='local var="value"  # function-scoped variables'
    [nameref]='declare -n ref=varname  # nameref (indirect reference)'
    [printf_format]='printf "%s\t%d\n" "text" 42'
    [readarray]='readarray -t lines < file.txt  # read file into array'
    [mapfile]='mapfile -t arr < <(command)  # command into array'
    [getopts]='getopts "abc:" opt  # parse CLI flags'
    [select_menu]='select choice in "opt1" "opt2"; do break; done'
    [coproc_adv]='coproc { while read line; do echo "got: $line"; done; }'
    [fd_redirect]='exec 3>file.txt; echo "hi" >&3; exec 3>&-'
    [stderr_redirect]='command 2>/dev/null  # suppress errors'
    [both_redirect]='command &>/dev/null  # suppress all output'
    [tee_pipe]='command | tee -a logfile  # copy to file AND stdout'
    [job_control]='command & ; jobs ; fg %1 ; bg %1 ; kill %1'
    [signal_trap]='trap "cleanup" EXIT INT TERM ERR'
    [arithmetic_ops]='(( i++ )) ; (( sum += n )) ; (( n % 2 == 0 ))'
    [string_contains]='[[ "$str" == *"substring"* ]]'
    [file_tests]='-f file -d dir -r readable -w writable -x executable -s non-empty'
    [bash53_wait]='wait -n  # wait for ANY background job (Bash 5.3)'
    [bash53_timestamp]='$EPOCHREALTIME  # microsecond timestamps (Bash 5.3)'
    [bash53_assoc_ref]='declare -A arr; arr["$key"]="$val"  # improved assoc handling'
  )

  # ── All Bash 5.3 Builtins ──
  BASH_BUILTINS=(
    [alias]='alias name=command — create command alias'
    [bg]='bg [jobspec] — run job in background'
    [bind]='bind [-lpsvPSVX] — bind key sequences to readline functions'
    [break]='break [n] — exit from loop n levels up'
    [builtin]='builtin cmd — run cmd as builtin only, skip functions'
    [caller]='caller [n] — return call stack info (line, subroutine, file)'
    [cd]='cd [-L|-P|-e|-@] [dir] — change directory'
    [compgen]='compgen [-abcdefgjksuv] — generate completions'
    [complete]='complete [-options] cmd — specify completion for cmd'
    [compopt]='compopt [-DE] [-o|-+o option] — modify completion'
    [continue]='continue [n] — skip to next loop n levels up'
    [declare]='declare [-aAfFgiIlnprtux] — declare variables/attributes'
    [dirs]='dirs [-clpv] [+N|-N] — display directory stack'
    [disown]='disown [-ar] [-h] [jobspec] — remove job from job table'
    [echo]='echo [-neE] [arg] — output text'
    [enable]='enable [-adDnps] [-f filename] [name] — enable/disable builtins'
    [eval]='eval [args] — evaluate arguments as shell commands'
    [exec]='exec [-cl] [-a name] [cmd] — replace shell or redirect'
    [exit]='exit [n] — exit with status n'
    [export]='export [-fn] [name[=value]] — mark vars for export'
    [fc]='fc [-e ename] [-lnr] [first] [last] — history fix command'
    [fg]='fg [jobspec] — bring job to foreground'
    [getopts]='getopts optstring name [args] — parse positional params'
    [hash]='hash [-dlpr] [-t name] [name] — remember command locations'
    [help]='help [-dms] [pattern] — display builtin help'
    [history]='history [-c] [-d offset] [n] — manage command history'
    [jobs]='jobs [-lnprs] [jobspec] — list active jobs'
    [kill]='kill [-s sig|-n sig|-sigspec] pid|jobspec — send signal'
    [let]='let expr [expr] — evaluate arithmetic'
    [local]='local [option] [name[=value]] — declare local variable'
    [logout]='logout [n] — exit login shell'
    [mapfile]='mapfile [-d delim] [-n count] [-O origin] [-s count] [-t] [-u fd] [-C callback] [-c quantum] [array] — read lines into array'
    [popd]='popd [-n] [+N|-N] — remove entries from directory stack'
    [printf]='printf [-v var] format [arguments] — format output'
    [pushd]='pushd [-n] [+N|-N|dir] — add directory to stack'
    [pwd]='pwd [-LP] — print working directory'
    [read]='read [-ers] [-a array] [-d delim] [-i text] [-n nchars] [-N nchars] [-p prompt] [-t timeout] [-u fd] [name] — read input'
    [readarray]='readarray [-d delim] [-n count] [-O origin] [-s count] [-t] [-u fd] [-C callback] [-c quantum] [array] — read into array'
    [readonly]='readonly [-aAf] [name[=value]] — mark vars readonly'
    [return]='return [n] — exit function with status n'
    [set]='set [-abefhkmnptuvxBCEHPT] [--] [arg] — set shell options'
    [shift]='shift [n] — shift positional params left by n'
    [shopt]='shopt [-pqsu] [-o] [optname] — set/unset shell options'
    [source]='source filename [args] — execute file in current shell'
    [suspend]='suspend [-f] — suspend execution of this shell'
    [test]='test expr — evaluate conditional expression'
    [time]='time [-p] pipeline — time a pipeline'
    [times]='times — print user/sys times for shell and children'
    [trap]='trap [-lp] [[arg] signal] — set signal handlers'
    [type]='type [-aafptP] name — describe how name is interpreted'
    [typeset]='typeset [options] — synonym for declare'
    [ulimit]='ulimit [-SHabcdefiklmnpqrstuvxPRT] [limit] — set resource limits'
    [umask]='umask [-p] [-S] [mode] — set file creation mask'
    [unalias]='unalias [-a] [name] — remove aliases'
    [unset]='unset [-fv] [-n] [name] — unset variable or function'
    [wait]='wait [-fn] [-p var] [id] — wait for jobs/processes'
  )

  # ── Special Variables (GNU Manual §3.4.2 + §5.1 + §5.2) ──
  BASH_SPECIAL_VARS=(
    ['$0']='Name of the script/shell'
    ['$1-$9']='Positional parameters (args to script/function)'
    ['${10}+']='Positional params >= 10 need braces'
    ['$#']='Number of positional parameters'
    ['$*']='All positional params as single word (IFS-joined)'
    ['$@']='All positional params as separate words (use this)'
    ['$?']='Exit status of last foreground command'
    ['$$']='PID of current shell'
    ['$!']='PID of last background command'
    ['$_']='Last argument of last command'
    ['$-']='Current shell option flags'
    ['BASH_VERSION']='Current Bash version string'
    ['BASH_VERSINFO']='Array of Bash version components'
    ['BASH_SOURCE']='Array of source file names (call stack)'
    ['BASH_LINENO']='Array of line numbers in call stack'
    ['BASH_COMMAND']='Command currently being executed'
    ['BASH_SUBSHELL']='Subshell nesting level'
    ['BASH_PID']='PID of current Bash process (Bash 4+)'
    ['EPOCHSECONDS']='Seconds since Unix epoch (Bash 5+)'
    ['EPOCHREALTIME']='Microseconds since epoch (Bash 5.3!)'
    ['LINENO']='Current line number in script'
    ['FUNCNAME']='Array of function names in call stack'
    ['HOSTNAME']='Current hostname'
    ['HOSTTYPE']='Machine type (e.g. x86_64)'
    ['OSTYPE']='OS type (e.g. linux-gnu)'
    ['IFS']='Internal Field Separator (default: space tab newline)'
    ['PATH']='Command search path (colon-separated)'
    ['HOME']='Current users home directory'
    ['PWD']='Current working directory'
    ['OLDPWD']='Previous working directory'
    ['RANDOM']='Random integer 0-32767'
    ['SECONDS']='Seconds since shell started'
    ['PIPESTATUS']='Array of exit codes from last pipeline'
    ['REPLY']='Default var for read builtin'
    ['MAPFILE']='Default array for mapfile/readarray builtins'
    ['COMP_WORDS']='Array of words in current completion'
    ['COMP_CWORD']='Index of current word in COMP_WORDS'
  )

  log_success "Knowledge base loaded: ${#BASH_KNOWLEDGE[@]} features, ${#BASH_BUILTINS[@]} builtins, ${#BASH_SPECIAL_VARS[@]} special vars"
}

# ─────────────────────────────────────────────────────────────────────────────
# LAYER 6: PROJECT TEMPLATE ENGINE
# Source: GNU Manual §3.3 Shell Functions + §6.7 Arrays
# ─────────────────────────────────────────────────────────────────────────────

load_project_templates() {
  PROJECT_TEMPLATES=(
    [node_setup]="node"
    [python_setup]="python"
    [docker_setup]="docker"
    [git_setup]="git"
    [server_setup]="server"
    [database_setup]="database"
    [backup_setup]="backup"
    [monitoring_setup]="monitoring"
    [deployment_setup]="deployment"
    [security_setup]="security"
    [wsl_setup]="wsl"
    [dev_env_setup]="devenv"
    [ci_cd_setup]="cicd"
    [ssl_setup]="ssl"
    [cron_setup]="cron"
    [log_rotation]="logs"
    [user_management]="users"
    [network_setup]="network"
    [cloudflare_setup]="cloudflare"
    [nextjs_setup]="nextjs"
    [custom]="custom"
  )
}

# ─────────────────────────────────────────────────────────────────────────────
# LAYER 7: SCRIPT GENERATOR ENGINE
# GNU Manual §3.8 Shell Scripts + §3.3 Shell Functions
# Takes a project type + details and generates a full annotated Bash script
# ─────────────────────────────────────────────────────────────────────────────

generate_script_header() {
  # Parameter expansion with default — GNU Manual §3.5.3
  local project_name="${1:-my-project}"
  local project_type="${2:-custom}"
  local description="${3:-Generated by Master Bash Agent}"

  # Heredoc — GNU Manual §3.6.6
  cat << HEADER
#!/usr/bin/env bash
# =============================================================================
# PROJECT: ${project_name^^}
# TYPE:    ${project_type}
# DESC:    ${description}
# BUILT:   $(date '+%Y-%m-%d %H:%M:%S')
# AGENT:   ${AGENT_NAME} v${AGENT_VERSION}
# COMPANY: ${COMPANY} | ${WEBSITE}
# =============================================================================
# USAGE:
#   chmod +x ${project_name// /_}.sh
#   ./${project_name// /_}.sh [--help] [--dry-run] [options]
# =============================================================================

set -euo pipefail
set -E

# ── Colors ──────────────────────────────────────────────────────────────────
RED=\$'\033[0;31m'; GREEN=\$'\033[0;32m'; YELLOW=\$'\033[1;33m'
CYAN=\$'\033[0;36m'; BOLD=\$'\033[1m'; RESET=\$'\033[0m'

# ── Logging ──────────────────────────────────────────────────────────────────
LOG_FILE="\${HOME}/.${project_name// /_}/setup.log"
mkdir -p "\$(dirname "\${LOG_FILE}")"
log()  { echo -e "[\$(date '+%H:%M:%S')] \$*" | tee -a "\${LOG_FILE}"; }
ok()   { log "\${GREEN}✅ \${1}\${RESET}"; }
warn() { log "\${YELLOW}⚠️  \${1}\${RESET}"; }
err()  { log "\${RED}❌ \${1}\${RESET}"; exit 1; }

# ── Dry-run flag ──────────────────────────────────────────────────────────────
DRY_RUN=false

# ── Argument parsing (getopts) — GNU Manual §4.2 ──────────────────────────────
while getopts ":hdv" opt; do
  case \${opt} in
    h) echo "Usage: \$0 [-h help] [-d dry-run] [-v verbose]"; exit 0 ;;
    d) DRY_RUN=true; log "Dry-run mode ON — no changes will be made" ;;
    v) set -x ;;
    :) err "Option -\${OPTARG} requires an argument" ;;
    ?) err "Unknown option: -\${OPTARG}" ;;
  esac
done

# ── Run command (respects dry-run) ───────────────────────────────────────────
run() {
  if \${DRY_RUN}; then
    echo "[DRY-RUN] \$*"
  else
    "\$@"
  fi
}

HEADER
}

# ─────────────────────────────────────────────────────────────────────────────
# TEMPLATE: Node.js / pnpm / fnm Setup
# ─────────────────────────────────────────────────────────────────────────────
generate_node_setup() {
  local project_name="${1:-node-project}"
  local node_version="${2:-22}"
  local output_file="${OUTPUT_DIR}/${project_name// /_}_setup.sh"

  {
    generate_script_header "${project_name}" "Node.js Setup" "Install fnm, Node ${node_version}, pnpm, and scaffold project"

    cat << 'NODESCRIPT'
# =============================================================================
# NODE.JS + pnpm SETUP
# =============================================================================

NODE_VERSION="${1:-22}"
PROJECT_NAME="${2:-my-node-app}"

check_deps() {
  local missing=()
  # Array operations — GNU Manual §6.7
  local required=("curl" "git" "unzip")
  for cmd in "${required[@]}"; do
    # Command test — GNU Manual §6.4 Conditional Expressions
    if ! command -v "${cmd}" &>/dev/null; then
      missing+=("${cmd}")
    fi
  done

  # Array length check — GNU Manual §3.5.3 ${#arr[@]}
  if [[ ${#missing[@]} -gt 0 ]]; then
    err "Missing dependencies: ${missing[*]}"
  fi
  ok "All dependencies present"
}

detect_os() {
  # OSTYPE special variable — GNU Manual §5.2
  case "${OSTYPE}" in
    linux*)   echo "linux"  ;;
    darwin*)  echo "macos"  ;;
    msys*|cygwin*|mingw*) echo "windows" ;;
    *)        echo "unknown" ;;
  esac
}

install_fnm() {
  if command -v fnm &>/dev/null; then
    ok "fnm already installed: $(fnm --version)"
    return 0
  fi

  log "Installing fnm (Fast Node Manager)..."
  local os
  os=$(detect_os)

  case "${os}" in
    linux|macos)
      run curl -fsSL https://fnm.vercel.app/install | bash
      # Source updated profile
      # Process substitution — GNU Manual §3.5.6
      local shell_rc
      shell_rc=$(ls ~/.bashrc ~/.zshrc 2>/dev/null | head -1)
      [[ -f "${shell_rc}" ]] && run source "${shell_rc}"
      ;;
    windows)
      log "Windows detected. Install fnm via: winget install Schniz.fnm"
      log "Then run: fnm install ${NODE_VERSION} && fnm use ${NODE_VERSION}"
      ;;
  esac
}

install_node() {
  log "Installing Node.js ${NODE_VERSION} via fnm..."
  run fnm install "${NODE_VERSION}"
  run fnm use "${NODE_VERSION}"
  run fnm default "${NODE_VERSION}"

  # Command substitution — GNU Manual §3.5.4
  local actual_version
  actual_version=$(node --version 2>/dev/null || echo "not found")
  ok "Node.js installed: ${actual_version}"
}

install_pnpm() {
  if command -v pnpm &>/dev/null; then
    ok "pnpm already installed: $(pnpm --version)"
    return 0
  fi
  log "Installing pnpm..."
  run npm install -g pnpm
  ok "pnpm installed: $(pnpm --version)"
}

scaffold_project() {
  log "Scaffolding project: ${PROJECT_NAME}..."

  # Brace expansion — GNU Manual §3.5.1
  run mkdir -p "${PROJECT_NAME}"/{src,tests,docs,scripts}

  # Heredoc into file — GNU Manual §3.6.6
  cat > "${PROJECT_NAME}/package.json" << PKG
{
  "name": "${PROJECT_NAME}",
  "version": "1.0.0",
  "description": "Built by ${COMPANY}",
  "main": "src/index.js",
  "scripts": {
    "dev": "node src/index.js",
    "test": "jest",
    "lint": "eslint src/"
  },
  "engines": { "node": ">=${NODE_VERSION}" }
}
PKG

  cat > "${PROJECT_NAME}/.gitignore" << GITIGNORE
node_modules/
dist/
.env
.env.local
*.log
GITIGNORE

  cat > "${PROJECT_NAME}/src/index.js" << INDEXJS
// Built by ${COMPANY} | ${WEBSITE}
console.log('Project ${PROJECT_NAME} is running!');
INDEXJS

  ok "Project scaffolded at ./${PROJECT_NAME}/"
}

verify_install() {
  log "Verifying installation..."
  # Associative array for version checks — GNU Manual §6.7
  declare -A version_check
  version_check=(
    [node]="$(node --version 2>/dev/null || echo 'MISSING')"
    [pnpm]="$(pnpm --version 2>/dev/null || echo 'MISSING')"
    [fnm]="$(fnm --version 2>/dev/null || echo 'MISSING')"
  )

  # Iterate associative array keys — ${!array[@]} — GNU Manual §6.7
  for tool in "${!version_check[@]}"; do
    local ver="${version_check[$tool]}"
    if [[ "${ver}" == "MISSING" ]]; then
      warn "${tool}: NOT FOUND"
    else
      ok "${tool}: ${ver}"
    fi
  done
}

main() {
  log "Starting Node.js setup for: ${PROJECT_NAME}"
  check_deps
  install_fnm
  install_node
  install_pnpm
  scaffold_project
  verify_install
  ok "Node.js setup complete! cd ${PROJECT_NAME} && pnpm install"
}

main "$@"
NODESCRIPT
  } > "${output_file}"

  chmod +x "${output_file}"
  print_success "Generated: ${output_file}"
}

# ─────────────────────────────────────────────────────────────────────────────
# TEMPLATE: Python + venv + pip Setup
# ─────────────────────────────────────────────────────────────────────────────
generate_python_setup() {
  local project_name="${1:-python-project}"
  local python_version="${2:-3.13}"
  local output_file="${OUTPUT_DIR}/${project_name// /_}_setup.sh"

  {
    generate_script_header "${project_name}" "Python Setup" "Install Python ${python_version}, virtualenv, scaffold project"

    cat << 'PYTEMPLATE'
# =============================================================================
# PYTHON + VIRTUALENV SETUP
# =============================================================================

PROJECT_NAME="${1:-my-python-app}"
PYTHON_VERSION="${2:-3.13}"
VENV_DIR=".venv"

find_python() {
  # Array of python executables to try — GNU Manual §6.7
  local candidates=("python${PYTHON_VERSION}" "python3.13" "python3.12" "python3" "python")
  local found=""

  for candidate in "${candidates[@]}"; do
    if command -v "${candidate}" &>/dev/null; then
      local ver
      # Command substitution — GNU Manual §3.5.4
      ver=$("${candidate}" --version 2>&1 | awk '{print $2}')
      found="${candidate}"
      log "Found Python: ${candidate} (${ver})"
      break
    fi
  done

  # Parameter check — GNU Manual §3.5.3
  if [[ -z "${found}" ]]; then
    err "Python not found. Install Python ${PYTHON_VERSION} first."
  fi

  # Return value via stdout — GNU best practice
  echo "${found}"
}

create_venv() {
  local python_bin
  python_bin=$(find_python)

  if [[ -d "${VENV_DIR}" ]]; then
    warn "Virtual environment already exists at ${VENV_DIR}"
    return 0
  fi

  log "Creating virtual environment with ${python_bin}..."
  run "${python_bin}" -m venv "${VENV_DIR}"
  ok "Virtual environment created: ${VENV_DIR}"
}

activate_and_install() {
  log "Activating virtual environment and installing packages..."

  # Source the activation script — GNU Manual §4.1 (source builtin)
  # shellcheck disable=SC1091
  run source "${VENV_DIR}/bin/activate"

  # Upgrade pip first — always
  run pip install --upgrade pip setuptools wheel

  # Install from requirements.txt if it exists
  # File test — GNU Manual §6.4 Conditional Expressions
  if [[ -f "requirements.txt" ]]; then
    run pip install -r requirements.txt
    ok "Installed from requirements.txt"
  else
    warn "No requirements.txt found — creating minimal one"
    cat > requirements.txt << REQS
# Add your dependencies here
# fastapi==0.135.1
# pydantic==2.10.0
# uvicorn==0.34.0
REQS
  fi
}

scaffold_python_project() {
  log "Scaffolding Python project: ${PROJECT_NAME}..."

  # Brace expansion for directories — GNU Manual §3.5.1
  run mkdir -p "${PROJECT_NAME}"/{src,tests,docs,scripts}
  run mkdir -p "${PROJECT_NAME}/src/${PROJECT_NAME//-/_}"

  cat > "${PROJECT_NAME}/src/__init__.py" << INIT
"""${PROJECT_NAME} — Built by ${COMPANY}"""
INIT

  cat > "${PROJECT_NAME}/main.py" << MAIN
#!/usr/bin/env python3
"""Entry point — ${PROJECT_NAME}"""

def main() -> None:
    print("${PROJECT_NAME} is running!")

if __name__ == "__main__":
    main()
MAIN

  cat > "${PROJECT_NAME}/.gitignore" << GITIG
.venv/
__pycache__/
*.pyc
*.pyo
.env
.env.local
dist/
*.egg-info/
GITIG

  cat > "${PROJECT_NAME}/pyproject.toml" << PYPROJECT
[project]
name = "${PROJECT_NAME}"
version = "1.0.0"
description = "Built by ${COMPANY}"
requires-python = ">=${PYTHON_VERSION}"

[tool.ruff]
line-length = 88
select = ["E", "F", "I"]

[tool.pytest.ini_options]
testpaths = ["tests"]
PYPROJECT

  ok "Python project scaffolded at ./${PROJECT_NAME}/"
}

run_health_check() {
  log "Running health check..."

  # Arithmetic expansion — GNU Manual §6.5
  local score=0
  local total=4

  command -v python3 &>/dev/null && (( score++ )) && ok "python3: available"
  command -v pip &>/dev/null    && (( score++ )) && ok "pip: available"
  [[ -d "${VENV_DIR}" ]]        && (( score++ )) && ok ".venv: exists"
  [[ -f "requirements.txt" ]]   && (( score++ )) && ok "requirements.txt: exists"

  log "Health score: ${score}/${total}"
  # Arithmetic comparison — GNU Manual §6.5
  if (( score < total )); then
    warn "Setup incomplete. Score: ${score}/${total}"
  else
    ok "All checks passed!"
  fi
}

main() {
  log "Starting Python setup for: ${PROJECT_NAME}"
  scaffold_python_project
  create_venv
  activate_and_install
  run_health_check
  ok "Python setup complete! cd ${PROJECT_NAME} && source .venv/bin/activate"
}

main "$@"
PYTEMPLATE
  } > "${output_file}"

  chmod +x "${output_file}"
  print_success "Generated: ${output_file}"
}

# ─────────────────────────────────────────────────────────────────────────────
# TEMPLATE: Docker Setup
# ─────────────────────────────────────────────────────────────────────────────
generate_docker_setup() {
  local project_name="${1:-docker-project}"
  local output_file="${OUTPUT_DIR}/${project_name// /_}_setup.sh"

  {
    generate_script_header "${project_name}" "Docker Setup" "Install Docker, verify, scaffold Dockerfile + compose"

    cat << 'DOCKERTEMPLATE'
# =============================================================================
# DOCKER SETUP + PROJECT SCAFFOLD
# =============================================================================

PROJECT_NAME="${1:-my-app}"
IMAGE_NAME="${PROJECT_NAME//_/-}"

detect_os() {
  # OSTYPE — GNU Manual §5.2 Bash Variables
  if [[ -f /etc/os-release ]]; then
    # Source the file to get variables — GNU Manual §4.1 (source)
    # Process substitution instead of sourcing untrusted file
    local os_id
    os_id=$(grep '^ID=' /etc/os-release | cut -d= -f2 | tr -d '"')
    echo "${os_id}"
  elif [[ "${OSTYPE}" == "darwin"* ]]; then
    echo "macos"
  elif [[ "${OSTYPE}" == "msys"* ]] || [[ "${OSTYPE}" == "cygwin"* ]]; then
    echo "windows"
  else
    echo "unknown"
  fi
}

install_docker() {
  if command -v docker &>/dev/null; then
    ok "Docker already installed: $(docker --version)"
    return 0
  fi

  local os
  os=$(detect_os)
  log "Installing Docker on: ${os}"

  case "${os}" in
    ubuntu|debian)
      run sudo apt-get update -y
      run sudo apt-get install -y ca-certificates curl gnupg lsb-release
      run sudo install -m 0755 -d /etc/apt/keyrings
      run curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
      run sudo chmod a+r /etc/apt/keyrings/docker.gpg
      run sudo apt-get update
      run sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
      ;;
    fedora|rhel|centos)
      run sudo dnf install -y docker docker-compose
      ;;
    macos)
      log "Install Docker Desktop from: https://docs.docker.com/desktop/mac/install/"
      ;;
    windows)
      log "Install Docker Desktop from: https://docs.docker.com/desktop/windows/install/"
      log "Enable WSL2 backend in Docker Desktop settings"
      ;;
    *)
      err "Unknown OS '${os}'. Install Docker manually: https://docs.docker.com/engine/install/"
      ;;
  esac
}

setup_docker_user() {
  # Only applies on Linux
  if [[ "$(detect_os)" == "windows" ]] || [[ "$(detect_os)" == "macos" ]]; then
    return 0
  fi

  # Add current user to docker group (no more sudo)
  if ! groups "${USER}" | grep -q docker; then
    log "Adding ${USER} to docker group..."
    run sudo usermod -aG docker "${USER}"
    warn "Log out and back in for group change to take effect"
  else
    ok "User ${USER} already in docker group"
  fi

  # Start + enable Docker service
  run sudo systemctl enable --now docker 2>/dev/null || true
}

scaffold_docker_files() {
  log "Scaffolding Docker files for: ${PROJECT_NAME}..."

  # Multi-stage Dockerfile (production best practice)
  cat > Dockerfile << DOCKERFILE
# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Production stage
FROM node:22-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
USER node
CMD ["node", "src/index.js"]
DOCKERFILE

  cat > docker-compose.yml << COMPOSE
version: "3.9"

services:
  app:
    build: .
    image: ${IMAGE_NAME}:latest
    container_name: ${IMAGE_NAME}-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.local
    depends_on:
      - db
      - redis

  db:
    image: postgres:17-alpine
    container_name: ${IMAGE_NAME}-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: \${DB_NAME:-appdb}
      POSTGRES_USER: \${DB_USER:-postgres}
      POSTGRES_PASSWORD: \${DB_PASS:-changeme}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    container_name: ${IMAGE_NAME}-redis
    restart: unless-stopped
    ports:
      - "6379:6379"

volumes:
  postgres_data:
COMPOSE

  cat > .env.example << ENVEX
# App
NODE_ENV=development
PORT=3000

# Database
DB_NAME=appdb
DB_USER=postgres
DB_PASS=changeme
DB_HOST=localhost
DB_PORT=5432

# Redis
REDIS_URL=redis://localhost:6379
ENVEX

  cat > .dockerignore << DOCKERIGNORE
node_modules
.git
.env
.env.local
*.log
dist
.next
DOCKERIGNORE

  ok "Docker files scaffolded!"
}

docker_health_check() {
  log "Verifying Docker setup..."

  # Using PIPESTATUS — GNU Manual §5.2 Bash Variables
  docker info &>/dev/null
  local docker_ok=${PIPESTATUS[0]}

  if (( docker_ok == 0 )); then
    ok "Docker daemon: running"
    ok "Docker version: $(docker --version)"
    command -v docker-compose &>/dev/null && ok "docker-compose: $(docker-compose --version)"
  else
    warn "Docker daemon not running. Start with: sudo systemctl start docker"
  fi
}

main() {
  log "Starting Docker setup for: ${PROJECT_NAME}"
  install_docker
  setup_docker_user
  scaffold_docker_files
  docker_health_check
  ok "Docker setup complete! Run: docker compose up -d"
}

main "$@"
DOCKERTEMPLATE
  } > "${output_file}"

  chmod +x "${output_file}"
  print_success "Generated: ${output_file}"
}

# ─────────────────────────────────────────────────────────────────────────────
# TEMPLATE: Git + GitHub + SSH Setup
# ─────────────────────────────────────────────────────────────────────────────
generate_git_setup() {
  local project_name="${1:-git-setup}"
  local output_file="${OUTPUT_DIR}/${project_name// /_}_setup.sh"

  {
    generate_script_header "${project_name}" "Git + GitHub SSH" "Configure Git, SSH keys, GitHub CLI"

    cat << 'GITTEMPLATE'
# =============================================================================
# GIT + GITHUB + SSH SETUP
# =============================================================================

GIT_NAME="${1:-Rick Jefferson}"
GIT_EMAIL="${2:-rjbizsolution23@gmail.com}"
GITHUB_USERNAME="${3:-rjbizsolution23-wq}"

configure_git() {
  log "Configuring Git globals..."

  run git config --global user.name  "${GIT_NAME}"
  run git config --global user.email "${GIT_EMAIL}"
  run git config --global init.defaultBranch main
  run git config --global core.autocrlf input        # CRLF fix for Windows
  run git config --global core.quotePath false        # Unicode filenames
  run git config --global pull.rebase false
  run git config --global push.default current
  run git config --global color.ui auto

  # Set VS Code as default editor (change to vim/nano as needed)
  if command -v code &>/dev/null; then
    run git config --global core.editor "code --wait"
  fi

  ok "Git configured for: ${GIT_NAME} <${GIT_EMAIL}>"
}

generate_ssh_key() {
  local key_file="${HOME}/.ssh/id_ed25519_github"

  # File test — GNU Manual §6.4 Conditional Expressions
  if [[ -f "${key_file}" ]]; then
    ok "SSH key already exists: ${key_file}"
    return 0
  fi

  log "Generating Ed25519 SSH key for GitHub..."
  run mkdir -p "${HOME}/.ssh"
  run chmod 700 "${HOME}/.ssh"

  # -t ed25519 is the modern, secure algorithm (better than RSA)
  run ssh-keygen -t ed25519 -C "${GIT_EMAIL}" -f "${key_file}" -N ""

  # Chmod — Ed25519 private key must be 600
  run chmod 600 "${key_file}"
  run chmod 644 "${key_file}.pub

  ok "SSH key generated: ${key_file}.pub"
}

configure_ssh() {
  local ssh_config="${HOME}/.ssh/config"

  log "Configuring SSH for GitHub..."

  # Append to config — GNU Manual §3.6.3 Appending Redirected Output
  cat >> "${ssh_config}" << SSHCONFIG

# GitHub — Personal (${GITHUB_USERNAME})
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_github
  IdentitiesOnly yes
  AddKeysToAgent yes

SSHCONFIG

  run chmod 600 "${ssh_config}"
  ok "SSH config updated"

  # Display public key for adding to GitHub
  echo ""
  echo -e "${CYAN}${BOLD}Add this public key to GitHub:${RESET}"
  echo -e "${DIM}github.com → Settings → SSH Keys → New SSH Key${RESET}"
  echo ""
  cat "${HOME}/.ssh/id_ed25519_github.pub"
  echo ""
}

start_ssh_agent() {
  log "Starting SSH agent..."

  # Check if agent is running — $SSH_AGENT_PID special var
  if [[ -z "${SSH_AGENT_PID:-}" ]] || ! kill -0 "${SSH_AGENT_PID}" 2>/dev/null; then
    # Eval output of ssh-agent — command substitution
    eval "$(ssh-agent -s)"
  fi

  run ssh-add "${HOME}/.ssh/id_ed25519_github" 2>/dev/null || true
  ok "SSH agent running, key added"
}

test_github_connection() {
  log "Testing GitHub SSH connection..."

  # Capture ssh output — process substitution
  local result
  result=$(ssh -T git@github.com 2>&1 || true)

  # String contains check — GNU Manual §6.4
  if [[ "${result}" == *"successfully authenticated"* ]]; then
    ok "GitHub SSH: authenticated as ${GITHUB_USERNAME}"
  else
    warn "GitHub SSH test result: ${result}"
    warn "Add your public key at: https://github.com/settings/keys"
  fi
}

init_repo() {
  log "Initializing Git repository in current directory..."

  if [[ -d ".git" ]]; then
    ok "Git repository already initialized"
    return 0
  fi

  run git init
  run git branch -M main

  # Create .gitignore if not present
  if [[ ! -f ".gitignore" ]]; then
    cat > .gitignore << GITIG
.env
.env.local
.env.*.local
node_modules/
.next/
dist/
build/
__pycache__/
.venv/
*.pyc
.DS_Store
*.log
.turbo/
.wrangler/
coverage/
GITIG
    ok ".gitignore created"
  fi

  ok "Repository initialized"
}

main() {
  log "Starting Git + GitHub setup..."
  configure_git
  generate_ssh_key
  configure_ssh
  start_ssh_agent
  test_github_connection
  init_repo
  ok "Git setup complete!"
  log "Next: git add . && git commit -m 'init' && git remote add origin git@github.com:${GITHUB_USERNAME}/repo.git && git push -u origin main"
}

main "$@"
GITTEMPLATE
  } > "${output_file}"

  chmod +x "${output_file}"
  print_success "Generated: ${output_file}"
}

# ─────────────────────────────────────────────────────────────────────────────
# TEMPLATE: WSL2 + Windows Full Dev Environment
# ─────────────────────────────────────────────────────────────────────────────
generate_wsl_setup() {
  local project_name="${1:-wsl-dev-setup}"
  local output_file="${OUTPUT_DIR}/${project_name// /_}_setup.sh"

  {
    generate_script_header "${project_name}" "WSL2 Dev Environment" "Full WSL2 + Node + Python + Docker + Git setup"

    cat << 'WSLTEMPLATE'
# =============================================================================
# WSL2 FULL DEVELOPER ENVIRONMENT SETUP
# Run this inside WSL2 (Ubuntu) after fresh install
# =============================================================================

GITHUB_USER="${1:-rjbizsolution23-wq}"
GITHUB_EMAIL="${2:-rjbizsolution23@gmail.com}"

update_system() {
  log "Updating system packages..."
  run sudo apt-get update -y
  run sudo apt-get upgrade -y
  run sudo apt-get install -y \
    curl wget git unzip zip \
    build-essential gcc g++ make \
    ca-certificates gnupg lsb-release \
    jq htop tree ripgrep fd-find \
    software-properties-common
  ok "System updated"
}

setup_git() {
  log "Configuring Git..."
  run git config --global user.name "${GITHUB_USER}"
  run git config --global user.email "${GITHUB_EMAIL}"
  run git config --global init.defaultBranch main
  run git config --global core.autocrlf input
  run git config --global core.quotePath false
  ok "Git configured"
}

install_fnm_node() {
  log "Installing fnm + Node.js 22..."
  curl -fsSL https://fnm.vercel.app/install | bash
  # Source updated bashrc
  export FNM_PATH="${HOME}/.local/share/fnm"
  export PATH="${FNM_PATH}:${PATH}"
  eval "$(fnm env --use-on-cd)"
  run fnm install 22
  run fnm default 22
  run fnm use 22
  ok "Node.js $(node --version) installed"
}

install_pnpm() {
  log "Installing pnpm..."
  run pnpm install -g pnpm
  ok "pnpm $(pnpm --version) installed"
}

install_python() {
  log "Installing Python 3.13..."
  run sudo add-apt-repository ppa:deadsnakes/ppa -y
  run sudo apt-get update -y
  run sudo apt-get install -y python3.13 python3.13-venv python3.13-dev python3-pip
  ok "Python $(python3.13 --version) installed"
}

install_gh_cli() {
  log "Installing GitHub CLI..."
  run curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
  run sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
  run echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
    | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
  run sudo apt-get update
  run sudo apt-get install -y gh
  ok "GitHub CLI $(gh --version | head -1) installed"
}

install_wrangler() {
  log "Installing Cloudflare Wrangler..."
  run pnpm install -g wrangler
  ok "Wrangler $(wrangler --version) installed"
}

install_terraform() {
  log "Installing Terraform..."
  run sudo apt-get install -y gnupg software-properties-common
  run wget -O- https://apt.releases.hashicorp.com/gpg \
    | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
  run echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" \
    | sudo tee /etc/apt/sources.list.d/hashicorp.list
  run sudo apt-get update
  run sudo apt-get install -y terraform
  ok "Terraform $(terraform --version | head -1) installed"
}

configure_bashrc() {
  log "Configuring ~/.bashrc..."

  # Append to .bashrc — GNU Manual §3.6.3
  cat >> "${HOME}/.bashrc" << 'BASHRC'

# ── RJ Business Solutions — Dev Environment ──────────────────────
export FNM_PATH="${HOME}/.local/share/fnm"
export PATH="${FNM_PATH}:${HOME}/.local/bin:${PATH}"
eval "$(fnm env --use-on-cd 2>/dev/null)"

# ── Aliases ───────────────────────────────────────────────────────
alias ll='ls -alFh --color=auto'
alias la='ls -A --color=auto'
alias l='ls -CF --color=auto'
alias ..='cd ..'
alias ...='cd ../..'
alias gs='git status'
alias ga='git add .'
alias gc='git commit -m'
alias gp='git push'
alias gl='git log --oneline --graph --decorate -15'
alias dk='docker'
alias dkc='docker compose'
alias tf='terraform'
alias wr='wrangler'

# ── Git prompt ────────────────────────────────────────────────────
parse_git_branch() {
  git branch 2>/dev/null | grep '*' | sed 's/* //'
}
export PS1='\[\033[1;32m\]\u@\h\[\033[0m\]:\[\033[1;34m\]\w\[\033[0;33m\]$(parse_git_branch)\[\033[0m\]\$ '

BASHRC

  ok "~/.bashrc configured"
}

run_final_summary() {
  # Associative array for version report — GNU Manual §6.7
  declare -A versions
  versions=(
    [node]="$(node --version 2>/dev/null || echo 'not found')"
    [pnpm]="$(pnpm --version 2>/dev/null || echo 'not found')"
    [python3]="$(python3.13 --version 2>/dev/null || echo 'not found')"
    [git]="$(git --version 2>/dev/null || echo 'not found')"
    [gh]="$(gh --version 2>/dev/null | head -1 || echo 'not found')"
    [docker]="$(docker --version 2>/dev/null || echo 'not found')"
    [wrangler]="$(wrangler --version 2>/dev/null || echo 'not found')"
    [terraform]="$(terraform --version 2>/dev/null | head -1 || echo 'not found')"
  )

  print_section "Installation Summary"
  for tool in "${!versions[@]}"; do
    local ver="${versions[$tool]}"
    if [[ "${ver}" == "not found" ]]; then
      print_warn "${tool}: ${ver}"
    else
      print_success "${tool}: ${ver}"
    fi
  done
}

main() {
  log "Starting WSL2 full dev environment setup..."
  update_system
  setup_git
  install_fnm_node
  install_pnpm
  install_python
  install_gh_cli
  install_wrangler
  install_terraform
  configure_bashrc
  run_final_summary
  ok "WSL2 dev environment ready!"
  warn "Run: source ~/.bashrc   to apply aliases and PATH changes"
}

main "$@"
WSLTEMPLATE
  } > "${output_file}"

  chmod +x "${output_file}"
  print_success "Generated: ${output_file}"
}

# ─────────────────────────────────────────────────────────────────────────────
# TEMPLATE: Server Monitoring + Health Check
# ─────────────────────────────────────────────────────────────────────────────
generate_monitoring_setup() {
  local project_name="${1:-monitoring-setup}"
  local output_file="${OUTPUT_DIR}/${project_name// /_}_setup.sh"

  {
    generate_script_header "${project_name}" "Server Monitoring" "System health checks, disk, CPU, memory, process monitoring"

    cat << 'MONTEMPLATE'
# =============================================================================
# SERVER MONITORING + HEALTH CHECK SYSTEM
# =============================================================================

ALERT_EMAIL="${1:-rjbizsolution23@gmail.com}"
DISK_THRESHOLD=85    # Alert if disk usage > 85%
MEM_THRESHOLD=90     # Alert if memory usage > 90%
CPU_THRESHOLD=80     # Alert if CPU usage > 80%

check_disk() {
  log "Checking disk usage..."

  # Process substitution + while read — GNU Manual §3.5.6 + §4.2 (read)
  while IFS= read -r line; do
    local usage filesystem
    usage=$(echo "${line}" | awk '{print $5}' | tr -d '%')
    filesystem=$(echo "${line}" | awk '{print $1}')

    # Arithmetic comparison — GNU Manual §6.5
    if (( usage > DISK_THRESHOLD )); then
      warn "DISK ALERT: ${filesystem} at ${usage}% (threshold: ${DISK_THRESHOLD}%)"
    else
      ok "Disk ${filesystem}: ${usage}%"
    fi
  done < <(df -h | grep '^/dev/')
}

check_memory() {
  log "Checking memory usage..."

  # Command substitution chains — GNU Manual §3.5.4
  local total used free mem_pct
  total=$(free -m | awk 'NR==2{print $2}')
  used=$(free -m  | awk 'NR==2{print $3}')
  free=$(free -m  | awk 'NR==2{print $4}')
  # Arithmetic expansion — GNU Manual §3.5.5
  mem_pct=$(( used * 100 / total ))

  if (( mem_pct > MEM_THRESHOLD )); then
    warn "MEMORY ALERT: ${mem_pct}% used (${used}MB / ${total}MB)"
  else
    ok "Memory: ${mem_pct}% (${used}MB used, ${free}MB free)"
  fi
}

check_cpu() {
  log "Checking CPU usage..."

  # Read CPU idle from /proc/stat — process substitution
  local cpu_idle cpu_usage
  cpu_idle=$(top -bn1 | grep "Cpu(s)" | awk '{print $8}' | tr -d '%id,')
  cpu_usage=$(echo "100 - ${cpu_idle:-0}" | bc 2>/dev/null || echo "N/A")

  if [[ "${cpu_usage}" != "N/A" ]]; then
    local cpu_int=${cpu_usage%.*}
    if (( cpu_int > CPU_THRESHOLD )); then
      warn "CPU ALERT: ${cpu_usage}% usage"
    else
      ok "CPU: ${cpu_usage}% usage"
    fi
  else
    ok "CPU: $(grep 'cpu MHz' /proc/cpuinfo | head -1 | awk '{print $4}') MHz"
  fi
}

check_processes() {
  log "Checking critical processes..."

  # Array of processes to monitor — GNU Manual §6.7
  local -a critical_procs=("nginx" "docker" "ssh" "cron")

  for proc in "${critical_procs[@]}"; do
    if pgrep -x "${proc}" &>/dev/null; then
      ok "Process ${proc}: running (PID: $(pgrep -x "${proc}" | head -1))"
    else
      warn "Process ${proc}: NOT running"
    fi
  done
}

check_ports() {
  log "Checking open ports..."

  # Array of ports to check — GNU Manual §6.7
  local -a ports=(22 80 443 3000 5432 6379)

  for port in "${ports[@]}"; do
    if ss -tlnp 2>/dev/null | grep -q ":${port} " || \
       netstat -tlnp 2>/dev/null | grep -q ":${port} "; then
      ok "Port ${port}: OPEN"
    else
      log "Port ${port}: closed"
    fi
  done
}

check_logs_for_errors() {
  log "Scanning system logs for errors..."

  # Array of log files to check — GNU Manual §6.7
  local -a log_files=(
    "/var/log/syslog"
    "/var/log/auth.log"
    "/var/log/nginx/error.log"
  )

  for logfile in "${log_files[@]}"; do
    # File test — GNU Manual §6.4 Conditional Expressions
    if [[ -f "${logfile}" ]]; then
      local error_count
      error_count=$(grep -c -i "error\|failed\|critical" "${logfile}" 2>/dev/null || echo "0")
      if (( error_count > 0 )); then
        warn "${logfile}: ${error_count} error entries found"
      else
        ok "${logfile}: no errors"
      fi
    fi
  done
}

generate_report() {
  local report_file="${HOME}/health-report-$(date +%Y%m%d_%H%M%S).txt"

  # Redirect entire block to file — GNU Manual §3.6.2
  {
    echo "=================================="
    echo "SERVER HEALTH REPORT"
    echo "Date: $(date)"
    echo "Host: $(hostname)"
    echo "Uptime: $(uptime -p)"
    echo "=================================="
    echo ""
    echo "DISK:"      ; df -h | grep '^/dev/'
    echo ""
    echo "MEMORY:"    ; free -h
    echo ""
    echo "CPU LOAD:"  ; uptime
    echo ""
    echo "TOP PROCESSES:"
    ps aux --sort=-%cpu | head -10
  } > "${report_file}"

  ok "Report saved: ${report_file}"
}

main() {
  print_section "Server Health Check — $(date)"
  check_disk
  check_memory
  check_cpu
  check_processes
  check_ports
  check_logs_for_errors
  generate_report
  ok "Health check complete!"
}

main "$@"
MONTEMPLATE
  } > "${output_file}"

  chmod +x "${output_file}"
  print_success "Generated: ${output_file}"
}

# ─────────────────────────────────────────────────────────────────────────────
# TEMPLATE: Custom Blueprint Generator
# Parses user's free-form request and generates the most appropriate script
# ─────────────────────────────────────────────────────────────────────────────
generate_custom_script() {
  local project_name="${1:-custom-project}"
  local description="${2:-Custom setup script}"
  local output_file="${OUTPUT_DIR}/${project_name// /_}_setup.sh"

  {
    generate_script_header "${project_name}" "Custom Blueprint" "${description}"

    cat << CUSTOMTEMPLATE
# =============================================================================
# CUSTOM PROJECT: ${project_name^^}
# REQUEST: ${description}
# =============================================================================
# This script was generated from your blueprint request.
# Customize the functions below to match your exact needs.
# =============================================================================

PROJECT_NAME="${project_name}"
PROJECT_DIR="\${HOME}/${project_name// /_}"

# ── PHASE 1: Prerequisites Check ──────────────────────────────────────────────
check_prerequisites() {
  log "Checking prerequisites for: \${PROJECT_NAME}..."

  # Add your required tools here
  local required=("git" "curl" "node" "python3")
  local missing=()

  for cmd in "\${required[@]}"; do
    if ! command -v "\${cmd}" &>/dev/null; then
      missing+=("\${cmd}")
    fi
  done

  if [[ \${#missing[@]} -gt 0 ]]; then
    err "Missing required tools: \${missing[*]}"
  fi

  ok "All prerequisites met"
}

# ── PHASE 2: Directory Structure ──────────────────────────────────────────────
setup_directories() {
  log "Creating project structure..."

  # Customize these directories for your project
  mkdir -p "\${PROJECT_DIR}"/{src,tests,docs,scripts,config,.github/workflows}

  ok "Directory structure created: \${PROJECT_DIR}"
}

# ── PHASE 3: Configuration Files ──────────────────────────────────────────────
create_config_files() {
  log "Creating configuration files..."

  # .env.example — never commit real secrets
  cat > "\${PROJECT_DIR}/.env.example" << 'ENVFILE'
# Environment Variables — Copy to .env.local and fill in real values
APP_NAME=${project_name}
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname

# Auth
JWT_SECRET=your-secret-here
NEXTAUTH_SECRET=your-nextauth-secret

# APIs
STRIPE_SECRET_KEY=sk_test_...
CLOUDFLARE_API_TOKEN=...
ENVFILE

  ok "Config files created"
}

# ── PHASE 4: Git Initialization ───────────────────────────────────────────────
init_git() {
  cd "\${PROJECT_DIR}"
  log "Initializing Git repository..."

  [[ -d ".git" ]] && { ok "Git already initialized"; return 0; }

  git init
  git branch -M main

  cat > .gitignore << 'GITIG'
.env
.env.local
.env.*.local
node_modules/
.next/
dist/
build/
__pycache__/
.venv/
*.pyc
.DS_Store
*.log
.turbo/
.wrangler/
coverage/
GITIG

  git add .
  git commit -m "feat: init ${project_name} — ${COMPANY}"
  ok "Git initialized with first commit"
}

# ── PHASE 5: Verify Setup ────────────────────────────────────────────────────
verify_setup() {
  log "Verifying setup..."

  # File tests — GNU Manual §6.4
  local checks_passed=0
  local checks_total=3

  [[ -d "\${PROJECT_DIR}" ]]              && (( checks_passed++ )) && ok "Project directory exists"
  [[ -f "\${PROJECT_DIR}/.env.example" ]] && (( checks_passed++ )) && ok "Config files created"
  [[ -d "\${PROJECT_DIR}/.git" ]]         && (( checks_passed++ )) && ok "Git repository initialized"

  log "Verification: \${checks_passed}/\${checks_total} checks passed"

  if (( checks_passed < checks_total )); then
    warn "Setup incomplete — \$(( checks_total - checks_passed )) checks failed"
  else
    ok "Setup verified!"
  fi
}

main() {
  log "Starting setup for: \${PROJECT_NAME}"
  log "Description: ${description}"

  check_prerequisites
  setup_directories
  create_config_files
  init_git
  verify_setup

  ok "Setup complete!"
  ok "Next steps:"
  log "  1. cd \${PROJECT_DIR}"
  log "  2. cp .env.example .env.local"
  log "  3. Fill in your secrets in .env.local"
  log "  4. Start building!"
}

main "\$@"
CUSTOMTEMPLATE
  } > "${output_file}"

  chmod +x "${output_file}"
  print_success "Generated: ${output_file}"
}

# ─────────────────────────────────────────────────────────────────────────────
# LAYER 8: KNOWLEDGE QUERY SYSTEM
# User can query any Bash feature, builtin, or special variable
# ─────────────────────────────────────────────────────────────────────────────

query_knowledge() {
  local query="${1:-}"
  query="${query,,}"  # lowercase — parameter expansion GNU Manual §3.5.3

  print_section "Bash Knowledge Query: ${query}"

  local found=false

  # Search in features — GNU Manual §6.7 array iteration
  for key in "${!BASH_KNOWLEDGE[@]}"; do
    if [[ "${key,,}" == *"${query}"* ]] || \
       [[ "${BASH_KNOWLEDGE[$key],,}" == *"${query}"* ]]; then
      echo -e "${CYAN}${BOLD}[FEATURE: ${key}]${RESET}"
      echo -e "  ${BASH_KNOWLEDGE[$key]}"
      echo ""
      found=true
    fi
  done

  # Search in builtins
  for key in "${!BASH_BUILTINS[@]}"; do
    if [[ "${key,,}" == *"${query}"* ]] || \
       [[ "${BASH_BUILTINS[$key],,}" == *"${query}"* ]]; then
      echo -e "${GREEN}${BOLD}[BUILTIN: ${key}]${RESET}"
      echo -e "  ${BASH_BUILTINS[$key]}"
      echo ""
      found=true
    fi
  done

  # Search in special vars
  for key in "${!BASH_SPECIAL_VARS[@]}"; do
    if [[ "${key,,}" == *"${query}"* ]] || \
       [[ "${BASH_SPECIAL_VARS[$key],,}" == *"${query}"* ]]; then
      echo -e "${MAGENTA}${BOLD}[SPECIAL VAR: ${key}]${RESET}"
      echo -e "  ${BASH_SPECIAL_VARS[$key]}"
      echo ""
      found=true
    fi
  done

  if ! ${found}; then
    print_warn "No results found for: '${query}'"
    print_info "Try: array, trap, redirect, expansion, variable, function, loop, getopts"
  fi
}

list_all_features() {
  print_section "All Bash 5.3 Features in Knowledge Base"

  echo -e "${CYAN}${BOLD}── FEATURES (${#BASH_KNOWLEDGE[@]}) ──${RESET}"
  # Sorted keys — process substitution with sort
  while IFS= read -r key; do
    printf "  %-30s %s\n" "${key}" "${DIM}${BASH_KNOWLEDGE[$key]:0:60}...${RESET}"
  done < <(printf '%s\n' "${!BASH_KNOWLEDGE[@]}" | sort)

  echo ""
  echo -e "${GREEN}${BOLD}── BUILTINS (${#BASH_BUILTINS[@]}) ──${RESET}"
  while IFS= read -r key; do
    printf "  %-20s %s\n" "${key}" "${DIM}${BASH_BUILTINS[$key]:0:60}${RESET}"
  done < <(printf '%s\n' "${!BASH_BUILTINS[@]}" | sort)

  echo ""
  echo -e "${MAGENTA}${BOLD}── SPECIAL VARS (${#BASH_SPECIAL_VARS[@]}) ──${RESET}"
  while IFS= read -r key; do
    printf "  %-20s %s\n" "${key}" "${DIM}${BASH_SPECIAL_VARS[$key]}${RESET}"
  done < <(printf '%s\n' "${!BASH_SPECIAL_VARS[@]}" | sort)
}

# ─────────────────────────────────────────────────────────────────────────────
# LAYER 9: INTERACTIVE MENU SYSTEM
# GNU Manual §3.2.5.2 Conditional Constructs (case) + §3.2.5.1 select
# ─────────────────────────────────────────────────────────────────────────────

show_main_menu() {
  echo -e "${BOLD}"
  cat << MENU
┌─────────────────────────────────────────────────────────┐
│               MASTER BASH AGENT — MAIN MENU             │
├─────────────────────────────────────────────────────────┤
│  [1]  Generate Script from Blueprint Request            │
│  [2]  Quick Templates (Node / Python / Docker / Git...) │
│  [3]  Query Bash Knowledge Base                         │
│  [4]  List ALL Bash 5.3 Features + Builtins             │
│  [5]  Show Special Variables Reference                  │
│  [6]  Open Output Directory                             │
│  [0]  Exit                                              │
└─────────────────────────────────────────────────────────┘
MENU
  echo -e "${RESET}"
}

show_template_menu() {
  echo -e "${BOLD}"
  cat << TMENU
┌─────────────────────────────────────────────────────────┐
│                  QUICK TEMPLATES                        │
├─────────────────────────────────────────────────────────┤
│  [1]  Node.js + pnpm + fnm Setup                        │
│  [2]  Python + virtualenv Setup                         │
│  [3]  Docker + Docker Compose Setup                     │
│  [4]  Git + GitHub + SSH Setup                          │
│  [5]  WSL2 Full Dev Environment                         │
│  [6]  Server Monitoring + Health Check                  │
│  [7]  Custom Blueprint (free-form request)              │
│  [0]  Back to Main Menu                                 │
└─────────────────────────────────────────────────────────┘
TMENU
  echo -e "${RESET}"
}

handle_blueprint_request() {
  print_section "Blueprint Request Builder"

  # read builtin — GNU Manual §4.2
  read -r -p "${CYAN}${BOLD}Project name:${RESET} " project_name
  project_name="${project_name:-my-project}"

  read -r -p "${CYAN}${BOLD}Describe your project (e.g. 'Node.js API with Docker and PostgreSQL'):${RESET} " description

  echo ""
  echo -e "${ARROW} Analyzing request: '${description}'"
  echo ""

  # Keyword detection using pattern matching — GNU Manual §3.5.3
  local detected_type="custom"
  local description_lower="${description,,}"

  if [[ "${description_lower}" == *"node"* ]] || \
     [[ "${description_lower}" == *"next"* ]] || \
     [[ "${description_lower}" == *"pnpm"* ]]; then
    detected_type="node"
  elif [[ "${description_lower}" == *"python"* ]] || \
       [[ "${description_lower}" == *"fastapi"* ]] || \
       [[ "${description_lower}" == *"django"* ]]; then
    detected_type="python"
  elif [[ "${description_lower}" == *"docker"* ]] || \
       [[ "${description_lower}" == *"container"* ]] || \
       [[ "${description_lower}" == *"compose"* ]]; then
    detected_type="docker"
  elif [[ "${description_lower}" == *"git"* ]] || \
       [[ "${description_lower}" == *"github"* ]] || \
       [[ "${description_lower}" == *"ssh"* ]]; then
    detected_type="git"
  elif [[ "${description_lower}" == *"wsl"* ]] || \
       [[ "${description_lower}" == *"windows"* ]] || \
       [[ "${description_lower}" == *"dev environment"* ]]; then
    detected_type="wsl"
  elif [[ "${description_lower}" == *"monitor"* ]] || \
       [[ "${description_lower}" == *"health"* ]] || \
       [[ "${description_lower}" == *"server"* ]]; then
    detected_type="monitoring"
  fi

  print_info "Detected type: ${BOLD}${detected_type}${RESET}"
  echo ""

  # Dispatch — case statement GNU Manual §3.2.5.2
  case "${detected_type}" in
    node)       generate_node_setup "${project_name}" ;;
    python)     generate_python_setup "${project_name}" ;;
    docker)     generate_docker_setup "${project_name}" ;;
    git)        generate_git_setup "${project_name}" ;;
    wsl)        generate_wsl_setup "${project_name}" ;;
    monitoring) generate_monitoring_setup "${project_name}" ;;
    *)          generate_custom_script "${project_name}" "${description}" ;;
  esac
}

# ─────────────────────────────────────────────────────────────────────────────
# LAYER 10: MAIN ENTRY POINT + INTERACTIVE LOOP
# GNU Manual §3.8 Shell Scripts + §3.2.5.1 Looping Constructs
# ─────────────────────────────────────────────────────────────────────────────
main() {
  init_logging
  load_knowledge_base
  load_project_templates

  # Handle CLI args first — GNU Manual §3.4.1 Positional Parameters
  if [[ $# -gt 0 ]]; then
    case "${1}" in
      --query|-q)
        query_knowledge "${2:-}"
        exit 0
        ;;
      --list|-l)
        list_all_features
        exit 0
        ;;
      --template|-t)
        # Direct template invocation
        case "${2:-}" in
          node)       generate_node_setup "${3:-node-project}" ;;
          python)     generate_python_setup "${3:-python-project}" ;;
          docker)     generate_docker_setup "${3:-docker-project}" ;;
          git)        generate_git_setup "${3:-git-setup}" ;;
          wsl)        generate_wsl_setup "${3:-wsl-setup}" ;;
          monitoring) generate_monitoring_setup "${3:-monitoring}" ;;
          *)
            err "Unknown template: ${2}. Options: node python docker git wsl monitoring"
            ;;
        esac
        exit 0
        ;;
      --help|-h)
        cat << HELP
${BOLD}MASTER BASH AGENT v${AGENT_VERSION}${RESET}
${COMPANY} | ${WEBSITE}

USAGE:
  ./bash-agent.sh                          Interactive mode
  ./bash-agent.sh --query <term>           Query knowledge base
  ./bash-agent.sh --list                   List all features
  ./bash-agent.sh --template node myapp    Generate node template
  ./bash-agent.sh --template python myapp  Generate python template
  ./bash-agent.sh --template docker myapp  Generate docker template
  ./bash-agent.sh --template git myapp     Generate git template
  ./bash-agent.sh --template wsl myapp     Generate WSL template
  ./bash-agent.sh --template monitoring    Generate monitoring script

OUTPUT: All scripts generated to: ${OUTPUT_DIR}/
HELP
        exit 0
        ;;
    esac
  fi

  # Interactive mode — while loop GNU Manual §3.2.5.1
  print_banner
  print_info "Output directory: ${OUTPUT_DIR}"
  print_info "All generated scripts will be executable and ready to run"
  echo ""

  local running=true
  while ${running}; do
    show_main_menu
    read -r -p "${CYAN}${BOLD}Select option:${RESET} " choice

    case "${choice}" in
      1)
        handle_blueprint_request
        ;;
      2)
        show_template_menu
        read -r -p "${CYAN}${BOLD}Select template:${RESET} " tchoice
        case "${tchoice}" in
          1) read -r -p "Project name: " pn; generate_node_setup "${pn:-node-project}" ;;
          2) read -r -p "Project name: " pn; generate_python_setup "${pn:-python-project}" ;;
          3) read -r -p "Project name: " pn; generate_docker_setup "${pn:-docker-project}" ;;
          4) read -r -p "Project name: " pn; generate_git_setup "${pn:-git-setup}" ;;
          5) read -r -p "Project name: " pn; generate_wsl_setup "${pn:-wsl-setup}" ;;
          6) read -r -p "Project name: " pn; generate_monitoring_setup "${pn:-monitoring}" ;;
          7) handle_blueprint_request ;;
          0) continue ;;
          *) print_warn "Invalid option: ${tchoice}" ;;
        esac
        ;;
      3)
        read -r -p "${CYAN}${BOLD}Search term (e.g. array, trap, redirect):${RESET} " q
        query_knowledge "${q}"
        ;;
      4)
        list_all_features
        ;;
      5)
        print_section "Bash 5.3 Special Variables Reference"
        for key in $(printf '%s\n' "${!BASH_SPECIAL_VARS[@]}" | sort); do
          printf "  ${MAGENTA}${BOLD}%-20s${RESET} %s\n" "${key}" "${BASH_SPECIAL_VARS[$key]}"
        done
        ;;
      6)
        mkdir -p "${OUTPUT_DIR}"
        print_info "Output directory: ${OUTPUT_DIR}"
        ls -la "${OUTPUT_DIR}" 2>/dev/null || print_info "(empty — no scripts generated yet)"
        ;;
      0|q|quit|exit)
        echo -e "\n${GREEN}${BOLD}${ROBOT} Master Bash Agent signing off. Ship it Rick! 🔥${RESET}"
        echo -e "${DIM}Built by ${COMPANY} | ${WEBSITE}${RESET}\n"
        running=false
        ;;
      *)
        print_warn "Invalid option: '${choice}'. Enter 0-6."
        ;;
    esac

    echo ""
    read -r -p "${DIM}Press Enter to continue...${RESET}" _
  done
}

# ── Entry Point ──────────────────────────────────────────────────────────────
main "$@"
Copy