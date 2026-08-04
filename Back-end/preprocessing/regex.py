import re
from clean_text import LoadData

def Regex(data):
    data = LoadData(data)
    data['text'] = data['text'].apply(lambda x: re.sub(r'[^a-zA-Z0-9\s]', '', x))
    return data