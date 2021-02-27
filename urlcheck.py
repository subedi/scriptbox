# URL check and vlaidate python script
# takes input list from a file
# Appends status message at end of line for each URL

# fixx ssl error while sending request
import ssl
#sslcontext = ssl.SSLContext()  # Only for gangstars
sslcontext = ssl._create_unverified_context() 

import urllib.request
import csv

                                                 
#create new file, writable file to append new columns
f = open('export.csv', 'w', newline='', encoding="utf8" )
writer = csv.writer(f)


#start reading csv file.
with open('meta.csv', encoding="utf8") as inputlist:
    reader = csv.reader(inputlist)

    #use enumeration to break for loop if necessary. 
    for i, row in enumerate(reader):

        ##Example for row/column access

        # column 1 data
        # print(row[0])

        # column 2 data
        # print(row[1])

        # column new data
        # basically means add a new column with the data below
        # row.append('berry')

        # display all row data
        # print (row)




        # specify which columns index is the URL data. 
        row_url = row[1]
        
        # if needed, limit rows for manipulation
        if (i>40000):
            break

        # In my case row[1] column is the actual URL from the list.
        # and add the resulting code into the csv to a new column
        try:
            # Send HTTP Request
            req = urllib.request.urlopen(row_url, timeout = 1, context=sslcontext)
            # Get HTTP Status Code
            httpcode = req.getcode()
            # Append Code to CSV as a new column
            row.append(httpcode)
            row.append("#pass")

        except Exception as excp:
            # Append Code to CSV as a new column
            row.append(excp)
            row.append("#fail")

        print(row)
        writer.writerow(row)
        
f.close()