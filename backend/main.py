from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from fastapi.openapi.utils import get_openapi
from fastapi.staticfiles import StaticFiles


load_dotenv()

from app.database import Base, engine
from app.routers import auth, medicine, sales, prediction,  alert

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Pharmacy Inventory System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router)
app.include_router(medicine.router)
app.include_router(sales.router)
app.include_router(prediction.router)
app.include_router(alert.router)







def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="Pharmacy Inventory System",
        version="1.0.0",
        description="API for managing pharmacy inventory and users.",
        routes=app.routes,
    )

    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }

   
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi