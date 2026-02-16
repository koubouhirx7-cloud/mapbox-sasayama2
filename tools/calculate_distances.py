import json
import math
import os
import glob

def haversine_distance(coord1, coord2):
    R = 6371  # Earth radius in km
    lat1, lon1 = math.radians(coord1[1]), math.radians(coord1[0])
    lat2, lon2 = math.radians(coord2[1]), math.radians(coord2[0])
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

def calculate_route_length(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    total_km = 0
    
    # Handle FeatureCollection
    features = data.get('features', [])
    if not features and data.get('type') == 'Feature':
        features = [data]
        
    for feature in features:
        geom = feature.get('geometry', {})
        if geom.get('type') == 'LineString':
            coords = geom.get('coordinates', [])
            for i in range(len(coords) - 1):
                total_km += haversine_distance(coords[i], coords[i+1])
                
    return total_km

# Scan src/data/course_*.json
data_dir = 'src/data'
course_files = glob.glob(os.path.join(data_dir, 'course_*.json'))

print("--- Course Distances ---")
for cf in course_files:
    try:
        dist = calculate_route_length(cf)
        basename = os.path.basename(cf)
        print(f"{basename}: {dist:.2f} km")
    except Exception as e:
        print(f"Error processing {cf}: {e}")
