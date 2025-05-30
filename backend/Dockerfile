FROM python:3.11

WORKDIR /app

COPY . .

RUN pip install --upgrade pip
RUN pip install -r req.txt
RUN apt-get update && apt-get install -y libjpeg-dev zlib1g-dev