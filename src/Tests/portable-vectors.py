"""Independent stdlib implementation of the versioned collaboration JSON subset."""
from pathlib import Path
import hashlib
import json

VECTORS = Path(__file__).resolve().parents[1] / 'Contracts/CollaborationV1/vectors.json'


def reject(*_):
    raise ValueError('invalid_json')


def integer(token):
    number = int(token)
    if token == '-0' or abs(number) > 9007199254740991:
        reject()
    return number


def object_pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            reject()
        result[key] = value
    return result


def canonical(value, depth=0):
    if depth > 64:
        reject()
    if isinstance(value, dict):
        keys = sorted(value, key=lambda key: key.encode('utf-16-be'))
        return '{' + ','.join(canonical(key, depth + 1) + ':' + canonical(value[key], depth + 1) for key in keys) + '}'
    if isinstance(value, list):
        return '[' + ','.join(canonical(item, depth + 1) for item in value) + ']'
    if isinstance(value, str):
        value.encode('utf-8', errors='strict')  # Reject lone surrogates; do not normalize.
    elif value is not None and not isinstance(value, (bool, int)):
        reject()
    elif isinstance(value, int) and abs(value) > 9007199254740991:
        reject()
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def parse(source):
    if len(source.encode('utf-8')) > 300000:
        reject()
    value = json.loads(source, parse_int=integer, parse_float=reject,
                       parse_constant=reject, object_pairs_hook=object_pairs)
    canonical(value)
    return value


def digest(text):
    return 'sha256:' + hashlib.sha256(text.encode('utf-8')).hexdigest()


def main():
    vectors = json.loads(VECTORS.read_text(encoding='utf-8'))
    for vector in vectors['valid']:
        actual = canonical(parse(vector['json']))
        assert actual == vector['canonical'], vector['id']
        assert digest(actual) == vector['digest'], vector['id']
    for vector in vectors['invalid']:
        try:
            parse(vector['json'])
        except (ValueError, UnicodeError):
            continue
        raise AssertionError('Expected rejection: ' + vector['id'])
    for vector in vectors['documents']:
        assert digest(vector['content']) == vector['digest'], vector['id']
    request = vectors['request']
    actual = canonical({'purpose': 'workflow-board-command-v1',
                        'authority': request['authority'], 'command': request['command']})
    assert actual == request['canonical']
    assert digest(actual) == request['digest']
    project_vectors = json.loads((VECTORS.parent.parent / 'CollaborationV2/vectors.json').read_text(encoding='utf-8'))
    for vector in project_vectors['requests']:
        actual = canonical({'purpose': vector['purpose'], 'authority': vector['authority'], 'command': vector['command']})
        assert actual == vector['canonical'], vector['id']
        assert digest(actual) == vector['digest'], vector['id']
        ref = vector['command'].get('workflow_ref', vector['command'].get('project_ref'))
        assert canonical([vector['authority']['owner_id'], ref['store_id'], ref['project_id'], vector['command']['operation_id']]) == vector['operation_key']
    print(json.dumps({'vectors': 28, 'passed': True, 'runtime': 'Python stdlib',
                      'project_vectors': len(project_vectors['requests']),
                      'scope': 'Portable encoding only; not the separate local prototype provider'}))


if __name__ == '__main__':
    main()
