import os

#dir is not keyword
def makemydir(whatever):
  try:
    os.makedirs(whatever)
  except OSError:
    pass
makemydir('/bidon333')
