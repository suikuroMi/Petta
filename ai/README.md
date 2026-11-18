# Petta AI Care Assistant — Training Pipeline (`Qwen/Qwen2.5-3B-Instruct`)

## Files

- `prepare_dataset.py` — Downloads `humane-lab/PetQA`, `viggovet/Veterinary-Med`, and `rhyliieee/tagalog-filipino-english-translation`, mixes them with Petta's curated Taglish/Bikol/Cebuano & emergency-triage guardrail examples, and writes ChatML `petta_train.jsonl` and `petta_eval.jsonl`.
- `train_petta_qwen3b_colab.ipynb` — Ready-to-run Google Colab notebook for 4-bit QLoRA fine-tuning on a free T4 GPU.
- `requirements.txt` — Python dependencies for local dataset prep or Colab.

## Cost / Free-Tier Breakdown

- **Training:** Free on Google Colab (T4 GPU) or Kaggle.
- **Model Storage:** Free on Hugging Face Hub.
- **Free Serving Options (after training):**
  1. **Colab T4 + Cloudflare Tunnel / Ngrok** during live demos (fastest, GPU-accelerated).
  2. **Hugging Face Space (Free CPU tier)** running a quantized GGUF (`Q4_K_M`) via `llama-cpp-python`.
  3. **Local Ollama** (`ollama create petta-care -f Modelfile`) for local/tunneled inference.
