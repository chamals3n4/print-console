use base64::Engine;
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::process::Command;

#[derive(Serialize)]
struct Printer {
    name: String,
    status: String,
}

#[derive(Serialize, Deserialize, Clone)]
struct PrintJob {
    id: String,
    printer: String,
    owner: String,
    size_bytes: u64,
    status: String,
    name: String,
}

/// Queries CUPS for available printers via `lpstat -p`
#[tauri::command]
fn list_printers() -> Result<Vec<Printer>, String> {
    let output = Command::new("lpstat")
        .arg("-p")
        .output()
        .map_err(|e| format!("Failed to list printers: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut printers = Vec::new();

    // `lpstat -p` output lines: "printer NAME is STATUS. ..."
    for line in stdout.lines() {
        if line.starts_with("printer ") {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 2 {
                let name = parts[1].to_string();
                let status = if line.contains("idle") {
                    "idle"
                } else if line.contains("disabled") {
                    "disabled"
                } else if line.contains("printing") {
                    "printing"
                } else {
                    "unknown"
                }
                .to_string();
                printers.push(Printer { name, status });
            }
        }
    }

    Ok(printers)
}

/// Lists active print jobs from CUPS via `lpstat -o`.
/// Each job's detailed status is fetched separately for richer info.
#[tauri::command]
fn list_print_jobs() -> Result<Vec<PrintJob>, String> {
    let output = Command::new("lpstat")
        .arg("-o")
        .output()
        .map_err(|e| format!("Failed to list jobs: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut jobs = Vec::new();

    // `lpstat -o` output: "printer-jobid owner size_bytes date time"
    for line in stdout.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 3 {
            // Split "PrinterName-123" into printer + job ID
            let printer_job: Vec<&str> = parts[0].splitn(2, '-').collect();
            let printer = printer_job[0].to_string();
            let job_id = if printer_job.len() > 1 {
                printer_job[1].to_string()
            } else {
                "?".to_string()
            };
            let owner = parts[1].to_string();
            let size_bytes: u64 = parts[2].parse().unwrap_or(0);
            let status = get_job_status(&printer, &job_id);

            jobs.push(PrintJob {
                id: job_id,
                printer,
                owner,
                size_bytes,
                status,
                name: format!("Job #{}", parts[0]),
            });
        }
    }

    Ok(jobs)
}

/// Gets detailed status for a single job via `lpstat -l -o printer-jobid`.
fn get_job_status(printer: &str, job_id: &str) -> String {
    let job_ref = format!("{}-{}", printer, job_id);
    let output = Command::new("lpstat")
        .arg("-l")
        .arg("-o")
        .arg(&job_ref)
        .output();

    if let Ok(out) = output {
        let stdout = String::from_utf8_lossy(&out.stdout);
        for line in stdout.lines() {
            let line = line.trim();
            if line.to_lowercase().starts_with("status:") {
                return line[7..].trim().to_string();
            }
        }
    }

    "pending".to_string()
}

/// Decodes a base64 PDF and writes it to /tmp so it can be previewed, opened,
/// or printed later without re-sending the data from the frontend.
#[tauri::command]
fn save_temp_file(file_data: String, file_name: String) -> Result<String, String> {
    let pdf_bytes = base64::engine::general_purpose::STANDARD
        .decode(&file_data)
        .map_err(|e| format!("Failed to decode PDF data: {}", e))?;

    let temp_dir = std::env::temp_dir();
    let temp_path = temp_dir.join(&file_name);
    let path_str = temp_path.to_str().unwrap().to_string();

    let mut file = std::fs::File::create(&temp_path)
        .map_err(|e| format!("Failed to create temp file: {}", e))?;
    file.write_all(&pdf_bytes)
        .map_err(|e| format!("Failed to write temp file: {}", e))?;

    Ok(path_str)
}

/// Renders a single page of a PDF to a 600px-wide PNG using `pdftoppm`.
/// Returns a base64 data URL so the frontend can display it directly.
#[tauri::command]
fn preview_page(file_path: String, page: i32) -> Result<String, String> {
    // Use process ID to avoid collisions between multiple preview renders
    let output_base = format!(
        "{}/prv_{}",
        std::env::temp_dir().to_str().unwrap(),
        std::process::id()
    );
    let output_png = format!("{}.png", output_base);

    let status = Command::new("pdftoppm")
        .arg("-f")
        .arg(page.to_string())
        .arg("-l")
        .arg(page.to_string())
        .arg("-scale-to")
        .arg("600")
        .arg("-png")
        .arg("-singlefile")
        .arg(&file_path)
        .arg(&output_base)
        .status()
        .map_err(|e| format!("Failed to run pdftoppm: {}", e))?;

    if !status.success() {
        return Err("pdftoppm failed to render page".to_string());
    }

    let png_bytes =
        std::fs::read(&output_png).map_err(|e| format!("Failed to read preview image: {}", e))?;
    let _ = std::fs::remove_file(&output_png);

    let b64 = base64::engine::general_purpose::STANDARD.encode(&png_bytes);
    Ok(format!("data:image/png;base64,{}", b64))
}

/// Opens a file with the system's default PDF viewer (xdg-open on Linux).
#[tauri::command]
fn open_pdf(file_path: String) -> Result<(), String> {
    Command::new("xdg-open")
        .arg(&file_path)
        .spawn()
        .map_err(|e| format!("Failed to open file: {}", e))?;
    Ok(())
}

/// Submits a PDF to CUPS for printing.
/// Passes multiple B&W option variants because different printer drivers
/// recognize different keywords (HP uses KGray, others use Gray, IPP uses monochrome).
#[tauri::command]
fn print_pdf(
    file_path: String,
    printer: String,
    copies: i32,
    color: bool,
    pages: String,
) -> Result<String, String> {
    let mut cmd = Command::new("lp");

    if !printer.is_empty() {
        cmd.arg("-d").arg(&printer);
    }

    cmd.arg("-n").arg(copies.to_string());
    let file_name = std::path::Path::new(&file_path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy();
    cmd.arg("-t").arg(file_name.as_ref());

    // Multiple options — CUPS picks the one the printer driver understands
    if !color {
        cmd.arg("-o").arg("print-color-mode=monochrome");
        cmd.arg("-o").arg("ColorModel=KGray");
        cmd.arg("-o").arg("ColorModel=Gray");
    }

    if pages == "odd" {
        cmd.arg("-o").arg("page-set=odd");
    } else if pages == "even" {
        cmd.arg("-o").arg("page-set=even");
    }

    cmd.arg(&file_path);

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to execute print command: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        // `lp` output: "request id is Printer-123 (1 file(s))"
        let job_info = if let Some(start) = stdout.find("request id is ") {
            let rest = &stdout[start + 14..];
            rest.split_whitespace().next().unwrap_or("").to_string()
        } else {
            "unknown".to_string()
        };

        Ok(format!(
            "Print job submitted: {} to {}",
            job_info,
            if printer.is_empty() {
                "default printer"
            } else {
                &printer
            }
        ))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

// tauri entry point
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_printers,
            list_print_jobs,
            save_temp_file,
            preview_page,
            open_pdf,
            print_pdf
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
