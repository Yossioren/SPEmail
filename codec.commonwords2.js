
CommonWordsCodec.prototype = new Codec();
CommonWordsCodec.prototype.constructor = Codec;
CommonWordsCodec.prototype.baseClass = Codec.prototype.constructor;

// Reverse the key-value in a hashmap (assuming, of course, it's possible)
CommonWordsCodec.prototype.invertMap = function(inTree) {
    var result = {};
    for (leaf in inTree) {
        result[inTree[leaf]] = leaf;
    }
    return result;
}

// Constructor
function CommonWordsCodec(map) {
    this.encodeMap = map;
    this.decodeMap = this.invertMap(map);
};


CommonWordsCodec.prototype.encode = function(inText) {
    encoded = new Array();
    // Split the string into characters
    var len = inText.length;
    for (i = 0; i < len; i++) {
        // Replace each character with its charcode's entry in the table, then space.
        encoded[i] = this.encodeMap[inText.charCodeAt(i)];
    }
    return encoded.join(" ");
}
CommonWordsCodec.prototype.decode = function(inText) {
    decoded = new Array();
    inArray = inText.split(" ");

    // Split the string into words
    var len = inArray.length;
    for (i = 0; i < len; i++) {
        decoded[i] = String.fromCharCode(this.decodeMap[inArray[i]]);
        // Replace each character with the charcode of its entry in the table.
    }
    return decoded.join("");
}

