import pandas as pd 

#Load the dataset
def LoadData(data):
    data['text'] = data.text.str.lower()
    return data
