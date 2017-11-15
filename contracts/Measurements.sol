pragma solidity ^0.4.2;

/*
Queries:
1. Measurements by timestamp
2. Measurements by SensorID
*/

contract Measurements {
	// the measurements
	uint num_measurements;
    string[] measurements;
    // the addresses
    uint num_addresses;
    address[] addresses;
    mapping (address => bool) addressExists;
    
    // mapping to index by id
	mapping (address => uint) num_indices_by_id;
	mapping (address => uint[]) indices_by_id;
	
	// mapping to index by timestamp
	mapping (uint => uint) num_indices_by_ts;
	mapping (uint => uint[]) indices_by_ts;

	event eNew(address id, uint ts, string measurement);

	function Measurements() {
	}

	function pushExternal(address id, string measurement) {
		// fire event
		eNew(id, block.timestamp, measurement);
		
		var idx = num_measurements++;
		measurements.push(measurement);

		if(!addressExists[id]) {
			addressExists[id] = true;
			addresses.push(id);
			++num_addresses;
		}
		
		indices_by_id[id].push(idx);
		++num_indices_by_id[id];
		
		indices_by_ts[block.timestamp].push(idx);
		++num_indices_by_ts[block.timestamp];
	}
	function push(string measurement) {
		pushExternal(msg.sender, measurement);
	}
	
	function getNumIndicesById(address id) constant returns(uint) {
		return num_indices_by_id[id];
	}
	function getById(address id, uint i) constant returns(string) {
		return measurements[indices_by_id[id][i]];
	}
	
	function getNumLast() constant returns(uint) {
		return num_addresses;
	}
	function getLast(uint i) constant returns(string) {
		var id = addresses[i];
		var m = num_indices_by_id[id];
		
		return measurements[indices_by_id[id][m-1]];
	}
	
	/*function getByTs(uint ts) constant returns(string[]) {
		var n = num_indices_by_id[ts];
		
		string[] results;
		for(var i=0; i<n; ++i)
			results.push(measurements[indices_by_ts[ts][i]]);
			
		return results;
	}*/
}
