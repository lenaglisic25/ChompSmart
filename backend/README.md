### ChompSmart Backend Setup

**1. Ensure Python is installed**

```bash
python --version
python -m pip --version
```
**2. Navigate to the correct directory**

```bash 
cd backend
```

**3. Set up Python virtual environment**
```bash
python -m venv venv
.\venv\Scripts\Activate.ps1
```

You should see (venv) in your terminal

**4. Install dependencies and check for installation**
```bash
python -m pip install -r requirements.txt
```

(You may have to save and restart your IDE for them to import properly)

**5. Run the backend server**

```bash
python -m uvicorn app.main:app --reload
```

Backend will run at: http://127.0.0.1:8000

Swagger API docs: http://127.0.0.1:8000/docs **->** allows you to explore and test API directly in browser!