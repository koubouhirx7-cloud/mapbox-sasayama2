import sys
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

def parse_kml(file_path):
    tree = ET.parse(file_path)
    root = tree.getroot()
    
    # Handle Namespaces
    ns = {'kml': 'http://www.opengis.net/kml/2.2'}
    
    # Find all Placemarks
    placemarks = root.findall('.//kml:Placemark', ns)
    
    features = []
    
    for pm in placemarks:
        name = pm.find('kml:name', ns)
        name = name.text if name is not None else "Unnamed"
        
        desc = pm.find('kml:description', ns)
        desc = desc.text if desc is not None else ""
        
        # Check for Point (Spot)
        point = pm.find('kml:Point', ns)
        if point is not None:
            coords_text = point.find('kml:coordinates', ns).text.strip()
            lon, lat, *_ = map(float, coords_text.split(','))
            
            features.append({
                "type": "Feature",
                "properties": {
                    "type": "spot",
                    "name": name,
                    "description": desc
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [lon, lat]
                }
            })
            continue

        # Check for LineString (Route)
        linestring = pm.find('kml:LineString', ns)
        if linestring is not None:
            coords_text = linestring.find('kml:coordinates', ns).text.strip()
            # Split by whitespace
            tuples = re.split(r'\s+', coords_text)
            coordinates = []
            for t in tuples:
                if ',' not in t: continue
                parts = t.split(',')
                # Always take at least lon, lat
                lon = float(parts[0])
                lat = float(parts[1])
                ele = float(parts[2]) if len(parts) > 2 else 0
                coordinates.append([lon, lat, ele])
            
            features.append({
                "type": "Feature",
                "properties": {
                    "type": "route_base",
                    "name": name
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": coordinates
                }
            })
            continue
            
    return features

def parse_gpx(file_path):
    tree = ET.parse(file_path)
    root = tree.getroot()
    
    # GPX Namespace is usually http://www.topografix.com/GPX/1/1 or 1/0
    # We'll use a wildcard strategy or simple tag stripping for robustness
    
    def strip_ns(tag):
        return tag.split('}', 1)[1] if '}' in tag else tag

    features = []
    
    # Tracks (trk) -> Route
    for trk in root.findall('.//{*}trk'):
        name_tag = trk.find('{*}name')
        name = name_tag.text if name_tag is not None else "Unnamed Route"
        
        coords = []
        for trkpt in trk.findall('.//{*}trkpt'):
            lat = float(trkpt.get('lat'))
            lon = float(trkpt.get('lon'))
            ele_tag = trkpt.find('{*}ele')
            ele = float(ele_tag.text) if ele_tag is not None else 0
            coords.append([lon, lat, ele])
            
        if coords:
            features.append({
                "type": "Feature",
                "properties": {
                    "type": "route_base",
                    "name": name
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": coords
                }
            })

    # Waypoints (wpt) -> Spots
    for wpt in root.findall('.//{*}wpt'):
        lat = float(wpt.get('lat'))
        lon = float(wpt.get('lon'))
        
        name_tag = wpt.find('{*}name')
        name = name_tag.text if name_tag is not None else "Unnamed Spot"
        
        desc_tag = wpt.find('{*}desc')
        desc = desc_tag.text if desc_tag is not None else ""
        
        features.append({
            "type": "Feature",
            "properties": {
                "type": "spot",
                "name": name,
                "description": desc
            },
            "geometry": {
                "type": "Point",
                "coordinates": [lon, lat]
            }
        })
        
    return features

def convert(input_path, output_path):
    print(f"Converting {input_path} -> {output_path}")
    
    file_ext = Path(input_path).suffix.lower()
    features = []
    
    try:
        if file_ext == '.kml':
            features = parse_kml(input_path)
        elif file_ext == '.gpx':
            features = parse_gpx(input_path)
        else:
            print(f"Unsupported format: {file_ext}")
            return
            
        geojson = {
            "type": "FeatureCollection",
            "features": features
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(geojson, f, indent=4, ensure_ascii=False)
            
        print(f"Success! {len(features)} features found.")
        
    except Exception as e:
        print(f"Error processing {input_path}: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 convert_kml.py <input_file> <output_file>")
        sys.exit(1)
        
    convert(sys.argv[1], sys.argv[2])
